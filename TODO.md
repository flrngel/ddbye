# Parallel TODO

Four isolated tracks. **Zero file overlap** — each track owns its own files and can be worked on independently in a separate branch or worktree.

---

## Track A: API Server

**Owns:** `server/**` (new files only)
**Reads (no edits):** `src/types.ts`, `docs/05_api-worker-contracts.md`, `contracts/`

| # | Task | Detail |
|---|------|--------|
| A1 | Init server package | `server/package.json`, `server/tsconfig.json`. Pick Express or Hono. |
| A2 | Shared types | Copy or re-export the domain types from `src/types.ts` so the server can import them without depending on the frontend build. |
| A3 | `POST /requests` | Accept `RequestInput`, create `DiligenceRequest` with status `queued`, persist, return `{ id, status, createdAt }`. |
| A4 | `GET /requests` | Return request summaries (id, title, status, parsedHints, channel, updatedAt) for the left rail. |
| A5 | `GET /requests/:id` | Return the full request including research + outreach packets. |
| A6 | SSE `/requests/:id/events` | Stream worker progress events (`request.parsing`, `request.resolved`, ..., `request.ready`, `request.failed`). |
| A7 | `POST /requests/:id/redraft` | Accept changed tone/channel, re-dispatch the draft step only. |
| A8 | Persistence layer | SQLite or Postgres — store requests as JSON blobs with indexed id + status. |
| A9 | Worker dispatch interface | Define how the server calls the worker (direct function call, queue, or HTTP). Does not implement the worker itself. |

---

## Track B: Research Worker

**Owns:** `worker/**` (new files only)
**Reads (no edits):** `src/types.ts`, `docs/04_agent-plan-claude-sdk.md`, `contracts/`

| # | Task | Detail |
|---|------|--------|
| B1 | Init worker package | `worker/package.json`, `worker/tsconfig.json`. Install `@anthropic-ai/agent-sdk`. |
| B2 | Agent scaffold | Set up Claude Agent SDK client with WebSearch + WebFetch tools. |
| B3 | Step 1: parse intake | Turn `RequestInput` into a structured job (target hypothesis, sender objective, offer, channel, focus). |
| B4 | Step 2: resolve target | Use agent to determine person, organization, pitchable surface from the fuzzy brief. |
| B5 | Step 3: expand context | Web research scoped to the user's focus areas (person background, service surface, investment thesis, recent signals, objections). |
| B6 | Step 4: synthesize wedge | Compress research into `recommendedAngle` (headline, rationale, mention[], avoid[]). |
| B7 | Step 5: generate outreach | Produce email + LinkedIn + X DM deliverables (title, subject lines, body, follow-up). |
| B8 | Step 6: quality gate | Check for overclaiming, fake familiarity, insulting target, unsupported assertions, evidence-copy mismatch. |
| B9 | Structured output | Return `ResearchPacket` + `OutreachPacket` matching the types in `src/types.ts`. Label every evidence item (User brief / Public web / Inference). |
| B10 | Progress callback | Emit stage events (parse → resolve → research → synthesize → draft → ready/failed) so the server can forward them via SSE. |

---

## Track C: Frontend Polish

**Owns:** `src/**`, `index.html`
**Does NOT touch:** `server/`, `worker/`, root config files, `tests/`

| # | Task | Detail |
|---|------|--------|
| C1 | Fix HTML title | Change `index.html` title from "My Google AI Studio App" to "Outreach OS". |
| C2 | Empty state | Show guidance when there are zero requests in the left rail. |
| C3 | Failed state UI | Add `failed` to `RequestStatus`, render an error card when a request fails. |
| C4 | Detailed run states | Expand the status display to show the full lifecycle (queued, parsing, resolving, researching, synthesizing, drafting, ready, failed) instead of just running/ready. |
| C5 | Delete / archive request | Add a delete button on request cards in the left rail. Update `AppContext` with a `deleteRequest(id)` action. |
| C6 | Redraft flow | After a request is `ready`, let the user change tone or channel and re-run just the draft step. Add `redraft(id, tone, channel)` to `AppContext`. |
| C7 | API client module | Create `src/lib/api.ts` with functions (`createRequest`, `fetchRequests`, `fetchRequest`, `subscribeToEvents`, `redraftRequest`) that call the server endpoints. Use `fetch` — no new dependencies. Default to mock mode when no server is running. |
| C8 | Connect AppContext to API | Replace `localStorage` reads with API calls. Replace `scheduleProgress` timers with SSE subscription. Keep mock fallback for demo mode. |
| C9 | Loading states | Add spinners or skeleton UI while API calls are in flight. |

---

## Track D: Quality & CI

**Owns:** root config files (`eslint.config.*`, `.prettierrc`, `vitest.config.*`, `playwright.config.*`), `tests/**`, `.github/**`
**Does NOT touch:** `src/`, `server/`, `worker/`, `index.html`

| # | Task | Detail |
|---|------|--------|
| D1 | ESLint + Prettier | Add `eslint.config.mjs` (flat config), `.prettierrc`. Add `lint:eslint` and `format` scripts to root `package.json`. |
| D2 | Vitest setup | Add `vitest.config.ts`. Create `tests/unit/` directory. Add `test` script to root `package.json`. |
| D3 | Unit tests: types & utils | `tests/unit/time.test.ts`, `tests/unit/utils.test.ts` — test `formatRelativeTime` and `cn`. |
| D4 | Unit tests: mockAgent | `tests/unit/mockAgent.test.ts` — test `createSimulatedRequest` (PG match, a16z match, generic fallback) and `advanceRun`. |
| D5 | Playwright setup | Add `playwright.config.ts`. Create `tests/e2e/` directory. Add `test:e2e` script. |
| D6 | E2E: demo flow | `tests/e2e/demo.spec.ts` — open console, load PG example, submit, verify stages progress, verify research board renders, verify outreach copy is copyable. |
| D7 | E2E: landing → console | `tests/e2e/navigation.spec.ts` — landing page loads, click "Open console" navigates to `/console`. |
| D8 | CI pipeline | `.github/workflows/ci.yml` — install, lint (tsc + eslint), test (vitest), build, e2e (playwright). |

---

## Dependency graph

```
Track A (server)  ─┐
                   ├──▶  Integration (after all 4 merge)
Track B (worker)  ─┤
                   │
Track C (frontend) ┤
                   │
Track D (quality)  ┘
```

All four tracks are fully independent. Integration happens after they merge:
- Server starts dispatching to worker (A9 + B10)
- Frontend calls real API instead of mock (C7/C8 + A3–A6)
- CI runs against the full stack (D8 validates everything)

---

## File ownership summary

| Directory / file | Owner | Others may read |
|-----------------|-------|-----------------|
| `server/**` | Track A | — |
| `worker/**` | Track B | — |
| `src/**`, `index.html` | Track C | Track D (imports for tests) |
| `tests/**`, `.github/**`, root configs | Track D | — |
| `src/types.ts` | Track C | Track A, Track B (read-only) |
| `docs/`, `contracts/` | Nobody (frozen reference) | All tracks |
| `package.json` (root) | Track D (devDeps + scripts only) | Track C (no changes needed) |
