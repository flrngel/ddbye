# Architecture review

## Summary

The four-track merge integrates a Hono API server (Track A), a Claude Agent SDK research worker (Track B), frontend polish with an API client layer (Track C), and a quality/CI layer (Track D) into a previously frontend-only prototype. The merge strategy — D first, then A, B, C — was sound, and the mechanical merge work (conflict resolution, lint fixes) was executed correctly.

However, the integration between the four tracks reveals several architectural gaps that were not visible until the code co-exists in main. Two of these are functional bugs that will silently fail at runtime in API mode. The most severe is that the SSE event transport layer is mismatched between server and frontend. The second is a field name discrepancy in the redraft API call. Both exist at integration boundaries that no current test exercises.

---

## Already covered by verification

- All 4 branches merged with merge commits; all 8 original commits preserved
- No merge conflict markers remain in any file
- `npm run lint` (tsc --noEmit), `npx vitest run` (36/36), `npx eslint .`, `server/` tsc, `worker/` tsc all pass
- Lint fixes (Input.tsx, Textarea.tsx, Console.tsx, AppContext.tsx) are semantically correct and do not change runtime behavior
- knowledge base files (`docs/xlfg/knowledge/`) contain content from all four tracks
- CI workflow file is wired to run on all branches with correct step ordering

---

## Net-new findings

### P0 (blockers)

**P0-1: SSE named events vs `source.onmessage` — server events are silently dropped in API mode**

The server (`server/src/routes/events.ts` and `server/src/sse.ts`) emits named SSE events using `stream.writeSSE({ data, event: 'request.ready', ... })`. Per the SSE spec and browser `EventSource` API, named events (i.e., those with an `event:` field) are only dispatched to listeners registered via `source.addEventListener('request.ready', ...)`. They are never dispatched to `source.onmessage`.

The frontend (`src/lib/api.ts`, line 50) registers only `source.onmessage`:

```ts
source.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data) as { type: string; payload: unknown };
    onEvent(data);
  } catch {
    // ignore malformed events
  }
};
```

In API mode, every intermediate and terminal event from the server — `request.parsing`, `request.resolved`, `request.researching`, `request.synthesizing`, `request.drafted`, `request.ready`, `request.failed` — will be silently discarded. The `subscribeAndHydrate` callback in `AppContext.tsx` (line 186) will never fire. The placeholder request will remain stuck in the sidebar with an empty `run: []` and never advance to `ready`.

This is a complete failure of API-mode request progression. It is undetectable at lint or unit-test time because there are no integration tests against a running server.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/lib/api.ts:50`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/events.ts:24-28`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/sse.ts:27-29`

Fix: Replace `source.onmessage` with `addEventListener` calls for each named event, or have the server emit unnamed messages (omit the `event:` field). The cleanest fix is to make the frontend subscribe to all events by name using a generic listener:

```ts
// Option A: listen to all named events that matter
const ALL_EVENTS = [
  'request.parsing', 'request.resolved', 'request.researching',
  'request.synthesized', 'request.drafted', 'request.ready', 'request.failed',
];
ALL_EVENTS.forEach((eventName) => {
  source.addEventListener(eventName, (e) => { ... });
});

// Option B: drop the event: field in server SSE emission so all events
// arrive as generic messages and onmessage fires as expected.
```

---

**P0-2: Redraft API field name mismatch — `channel` vs `preferredChannel`**

The frontend sends:

```ts
// src/lib/api.ts:70
body: JSON.stringify({ tone, channel }),
```

The server expects:

```ts
// server/src/routes/redraft.ts:26
const { tone, preferredChannel } = body as { tone?: string; preferredChannel?: string };
```

The server reads `preferredChannel` from the body, not `channel`. The validation gate at line 28 (`if (!tone && !preferredChannel)`) will see both fields as undefined when a `channel`-only redraft is attempted. If `tone` is also provided, the redraft will succeed but will ignore the channel change entirely — the new `preferredChannel` will never be written to `req.input`.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/lib/api.ts:70`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/redraft.ts:26`

Fix: Align the field name. Either change the frontend to send `preferredChannel` or change the server to accept `channel`.

---

### P1 (important)

**P1-1: `GET /requests` returns `RequestSummary[]` but `api.ts` types it as `DiligenceRequest[]`**

The server's list endpoint (`server/src/routes/requests.ts`, lines 83-91) maps all requests to `RequestSummary` objects, which contain only: `id`, `title`, `status`, `parsedHints`, `preferredChannel`, `updatedAt`. It omits `input`, `run`, `research`, `outreach`, `createdAt`, `errorMessage`.

The frontend's `fetchRequests()` (`src/lib/api.ts`, line 30) declares its return type as `Promise<DiligenceRequest[]>`. TypeScript accepts this because the response is cast via `res.json()` with no runtime validation.

In API mode on initial load, `AppContext.tsx` calls `fetchRequests()` and populates `requests` state with the returned `RequestSummary` objects dressed as `DiligenceRequest`. Any access to `request.input`, `request.run`, `request.research`, or `request.outreach` will produce `undefined` at runtime despite TypeScript believing those fields exist.

The sidebar list rendering is relatively safe because it only uses `id`, `title`, `status`, `parsedHints`, `updatedAt`, and `input.preferredChannel` — but `input.preferredChannel` will be `undefined` (the field in `RequestSummary` is `preferredChannel` at the top level, not nested in `input`). The `channelLabel` calculation in `Console.tsx` (line 187) reads `request.input.preferredChannel`, which will throw at runtime.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/requests.ts:83-91`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/lib/api.ts:30`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/pages/Console.tsx:187`

Fix: Either change `GET /requests` to return full `DiligenceRequest[]` (currently implemented in `listRequests()` which already does this), or add a second hydration step in `AppContext` that fetches full objects for the sidebar, or accept the summary shape and type it properly + add optional chaining in the UI.

---

**P1-2: Three copies of the domain type definitions with no enforcement of sync**

`src/types.ts`, `server/src/types.ts`, and `worker/src/types.ts` each define the full set of domain types (`Channel`, `Tone`, `RequestInput`, `ResearchPacket`, `OutreachPacket`, `DiligenceRequest`, etc.). The worker file even carries a comment: `// Mirrored from src/types.ts — do not import from src/. Keep in sync manually.`

The three definitions have already diverged in one meaningful way: `server/src/types.ts` adds `errorMessage` as absent (the frontend `src/types.ts` has `errorMessage?: string` on `DiligenceRequest`; the server type does not). The server never writes `errorMessage` when transitioning to `failed` status — it only writes `error: 'unknown failure'` in the SSE payload, which the frontend has no code to extract and assign. The frontend's failed-state UI (`Console.tsx`, line 403) renders `selectedRequest.errorMessage`, which will always be the hardcoded fallback string in API mode.

The "duplicate over share" decision was recorded in `docs/xlfg/knowledge/decision-log.md` and is acceptable for MVP. The risk is that future field additions to one copy will be missed in others. Without a linting or codegen step to flag divergence, this will accumulate silently.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/types.ts:85`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/types.ts` (no `errorMessage` field)
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/types.ts` (no `errorMessage` field)

---

**P1-3: Server worker hardcodes PG/Hacker News stub for every request**

`server/src/worker.ts` is the stub dispatcher that the server uses today. It hardcodes Paul Graham / Hacker News data for all requests regardless of the brief (lines 77-78):

```ts
req.parsedHints = ['PG', 'Hacker News', 'search'];
req.title = 'Paul Graham / Hacker News';
```

And it attaches `stubResearch` and `stubOutreach` from `server/src/stubs.ts` to every single request. This is intentional scaffolding, but the architectural concern is that the `worker/` package (Track B) has been implemented as a fully standalone package with no connection to `server/`. The `server/src/worker.ts` file still has `// TODO Track B: replace with real Claude Agent SDK call` comments, and the `worker/` package is not imported in `server/package.json`.

The path from the real worker to the server is completely undefined at the integration level. There is no documented wiring plan for how `runDiligence()` (from `worker/src/index.ts`) will replace `dispatchWorker()` (in `server/src/worker.ts`). The two packages have independent types and no shared contract.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/worker.ts:41-109`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/package.json` (no worker dependency)
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/index.ts:40`

---

**P1-4: CI does not type-check `server/` or `worker/`**

The CI workflow (`/.github/workflows/ci.yml`) runs `npm run lint` (frontend tsc) and `npm test` (Vitest for frontend), but does not `cd server && npm run lint` or `cd worker && npm run lint`. Type regressions in the server or worker will not be caught in CI.

The verification document (`verification.md`) notes that `cd server && npx tsc --noEmit` and `cd worker && npx tsc --noEmit` both pass, but those were run manually, not in CI. Any future change to server or worker can silently break type safety without failing the gate.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.github/workflows/ci.yml`

---

**P1-5: `status as DiligenceRequest['status']` casts are unsound in API mode**

In `AppContext.tsx` at lines 220 and 265, the frontend casts the `status` value returned from `createRequest()` using:

```ts
status: status as DiligenceRequest['status'],
```

The frontend `DiligenceRequest['status']` type is `'running' | 'ready' | 'failed'`. The server returns `status: 'queued'` from `POST /requests` (201 response). `'queued'` is not in the frontend's `RequestStatus` union. TypeScript accepts the cast silently, but the sidebar badge logic:

```ts
// Console.tsx:201
variant={request.status === 'ready' ? 'ready' : request.status === 'failed' ? 'failed' : 'running'}
```

will render `queued` status as `'running'` which is acceptable visually but semantically incorrect. More importantly, the status comparison for SSE terminal detection will not account for the fact that the server has 8 status values while the frontend type only knows 3.

File references:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/store/AppContext.tsx:220`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/store/AppContext.tsx:265`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/types.ts:11`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/types.ts:12-21`

---

### P2 (minor)

**P2-1: `continue-on-error: true` comments in CI are stale after Track C merge**

The CI workflow contains:

```yaml
- name: ESLint
  # Expected to fail until Track C fixes src/ issues
  continue-on-error: true
  run: npm run lint:eslint

- name: Format check
  # Expected to fail until Track C fixes src/ issues
  continue-on-error: true
  run: npm run format:check
```

Track C has been merged and the ESLint fix commit (`35a6b48`) resolved the errors. `npx eslint .` now passes with zero errors. However, Prettier still has 12 files with violations (verified by running `npx prettier --check src/` — all 12 files in `tests/lint-report.md` remain unformatted). The comments are partially stale: ESLint is now enforced but Prettier is still expected to fail. The `continue-on-error: true` flags should remain for Prettier but ESLint can be hardened to a blocker.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.github/workflows/ci.yml:27-34`

---

**P2-2: DB path guard has a logical redundancy that makes one condition unreachable**

In `server/src/db.ts` (line 11):

```ts
if (!dbPath.startsWith(projectRoot + path.sep) && !dbPath.startsWith(path.resolve(import.meta.dirname, '..'))) {
```

`projectRoot` is already resolved to `path.resolve(import.meta.dirname, '..', '..')`. The second condition (`dbPath.startsWith(path.resolve(import.meta.dirname, '..'))`) is a superset of the first since any path starting with `projectRoot + path.sep` also starts with `path.resolve(import.meta.dirname, '..')`. This means the combined condition reduces to just the second condition. The intent was presumably to allow both the project root and the server directory specifically, but the logic as written allows any path under the server's parent directory (i.e., two levels up from `server/src/`), which is the same as the project root. The guard is not broken, but it is logically redundant and potentially confusing.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/db.ts:10-13`

---

**P2-3: SSE stream keep-alive uses polling interval rather than Hono keepalive primitives**

`server/src/routes/events.ts` (lines 59-66) keeps the SSE stream alive using:

```ts
await new Promise<void>((resolve) => {
  const interval = setInterval(() => {
    if (closed) {
      clearInterval(interval);
      resolve();
    }
  }, 500);
});
```

This polls every 500ms to check whether the stream has closed rather than using a proper keep-alive heartbeat (e.g., periodic `': keep-alive\n\n'` SSE comment writes). The polling wastes CPU for the lifetime of every open SSE connection and does not send heartbeat data to prevent proxy/load-balancer connection timeouts. For MVP this is acceptable but is a known maintenance hazard.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/events.ts:59-66`

---

**P2-4: Worker `bypassPermissions` and `allowDangerouslySkipPermissions` are both set**

In `worker/src/agent.ts` (lines 35-36), the worker sets both:

```ts
permissionMode: "bypassPermissions",
allowDangerouslySkipPermissions: true,
```

The comment explains that this removes interactive approval prompts while the `allowedTools` array constrains actual tool access. This is technically correct for a headless server worker, but both flags simultaneously is redundant — `permissionMode: "bypassPermissions"` subsumes `allowDangerouslySkipPermissions`. More importantly, this means the worker relies entirely on the `allowedTools` array being correctly specified at each call site. There is no safety net if a call site accidentally passes `allowedTools: ["WebSearch", "WebFetch"]` to a synthesis or draft step (which should have `allowedTools: []`). The comment in the code is adequate documentation, but the API design for the SDK makes this easy to misconfigure.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/agent.ts:33-40`

---

**P2-5: `subscribeAndHydrate` advances run stages locally from SSE intermediate events using `advanceRun` — not from actual server stage data**

In `AppContext.tsx` (lines 196-202), when an intermediate SSE event arrives (not `request.ready` or `request.failed`), the frontend calls `advanceRun(r.run)` on the local run state:

```ts
} else {
  setRequests((current) =>
    current.map((r) => {
      if (r.id !== id) return r;
      return { ...r, run: advanceRun(r.run), updatedAt: new Date().toISOString() };
    }),
  );
}
```

`advanceRun` is a sequential stepper from the mock agent that blindly advances the next queued stage to running and the prior running stage to done. But the server's SSE events carry the actual stage name in their event type (e.g., `request.researching` for the research stage). The frontend ignores that information and simply steps the local stage machine forward. This means that if the server emits events out of order, or if a connection resumes mid-pipeline, the local run display will be desynchronized from the true server state until the terminal `request.ready` event triggers a full hydration.

This is a cosmetic correctness issue — the final hydration fetch ensures the UI is accurate at completion — but it means the progress display during a run may show the wrong stage as active.

File reference:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/store/AppContext.tsx:196-203`

---

## Why verification did not catch net-new findings

The verification suite was limited to:

1. Compiler type checks (`tsc --noEmit`) — all three type systems (`src/`, `server/`, `worker/`) are internally consistent. The bugs are at integration boundaries where TypeScript cannot see both sides simultaneously (e.g., the server response shape vs. the frontend's expected shape). No shared type package means the compiler cannot check cross-package correctness.

2. Vitest unit tests — the 36 tests cover `time`, `utils`, and `mockAgent` modules. None of these tests exercise the API client (`src/lib/api.ts`), the server routes, or the SSE transport.

3. ESLint — static analysis catches unused variables and type patterns but cannot detect runtime behavioral mismatches like the `onmessage` vs named-event issue or the `channel` vs `preferredChannel` field name mismatch.

4. Playwright E2E tests — the existing specs (`demo.spec.ts`, `navigation.spec.ts`) run against the Vite dev server in mock mode only. The tests do not start a real server, so `VITE_API_BASE` is never set during E2E runs, and all API-mode code paths are untested.

The net-new findings are exclusively integration-layer bugs that would only manifest when running the frontend against a real server instance — a scenario that no automated test currently exercises.

---

## Suggested refactors

**For P0-1 (SSE event name mismatch):** Change `src/lib/api.ts`'s `subscribeToEvents` to use `addEventListener` for each expected named event, or change the server to emit unnamed messages. The named-event approach is cleaner because it makes the event taxonomy explicit in both places.

**For P0-2 (redraft field name):** Standardize on `preferredChannel` everywhere (matching the domain model). Change `src/lib/api.ts` line 70 to `JSON.stringify({ tone, preferredChannel: channel })` and rename the parameter for clarity.

**For P1-1 (list vs full objects):** The simplest fix is to remove the `RequestSummary` projection in `GET /requests` and return full `DiligenceRequest` objects (which `listRequests()` already supports). Premature optimization of the list response shape created the type boundary mismatch. Alternatively, add a proper summary type to `src/types.ts` and update `fetchRequests()` to return `RequestSummary[]`, with a separate hydration step when a request is selected.

**For P1-4 (CI coverage):** Add two steps to `.github/workflows/ci.yml`:

```yaml
- name: Type check (server)
  run: cd server && npm ci && npm run lint

- name: Type check (worker)
  run: cd worker && npm ci && npm run lint
```

**For P1-2 (type duplication):** Near-term: add a brief comment in each duplicated type file listing which fields are present in the other copies, so a reviewer notices divergence. Medium-term: once the server and worker are more stable, extract shared types to a `packages/types` workspace and use npm workspaces to reference them. This is consistent with the project being structured as a monorepo (`server/`, `worker/`, root frontend).

**For P2-1 (stale CI comments):** Update the ESLint step to remove `continue-on-error: true` and update the comment on the Prettier step to reflect that ESLint is now clean.

**For P2-3 (SSE heartbeat):** Replace the polling interval with a periodic keep-alive SSE comment write:

```ts
const heartbeat = setInterval(() => {
  stream.write(': keep-alive\n\n').catch(() => { closed = true; });
}, 15000);
// ... in onAbort and terminal-event handlers: clearInterval(heartbeat)
```
