# Checker Report

## Task
T2: Core Routes (A3, A4, A5)
Run: `20260228-103744-api-server`

## Verdict
- ACCEPT

---

## Findings

### Blockers
None.

### Important

**A3 — Double import from worker.ts (cosmetic, not a bug)**

`/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/routes/requests.ts` lines 4–5 import from `../worker.js` twice:

```typescript
import { dispatchWorker } from '../worker.js';
import { makeDefaultRun } from '../worker.js';
```

These two statements should be merged into one import. TypeScript's `tsc --noEmit` accepts this without error, and Node resolves the module only once, so it is not a runtime problem. It is noise that could confuse future readers.

**A3 — Error message shape for missing enum fields is technically correct but slightly misleading**

If `tone`, `preferredChannel`, or `goalType` are entirely omitted from the request body, the validation falls into the enum check branch (since `undefined` is not in the enum array) and returns `{ error: "preferredChannel must be one of email, linkedin, x_dm" }` rather than a "required" message. Spec table (spec.md line 309) only mandates 400 with `{ error: string }` — no exact wording is required. The 400 is returned correctly.

**A3 — ID format uses 8 hex chars instead of spec example's 6 alphanumeric**

The spec states "the `id` is prefixed `req_` followed by a short random string (e.g., `req_k3m9x2`)". The implementation generates `req_` + 8 hex chars (4 bytes), e.g., `req_3f804168`. The spec example is illustrative only; the requirement is "prefixed `req_`" plus "short random string." The implementation satisfies that requirement. No collision risk concern at MVP scale.

### Nice-to-have

- Merge the two `import ... from '../worker.js'` lines in `requests.ts` into one import statement.
- Consider returning `{ error: "tone is required" }` (rather than the enum error) when the enum fields are entirely absent, for a clearer client-facing error.

---

## Criterion-by-criterion assessment

### A3 — POST /requests

| Criterion | Status | Evidence |
|---|---|---|
| Accepts JSON body matching RequestInput | PASS | Lines 17–49 of requests.ts validate all 7 fields |
| Returns `{ id, status: 'queued', createdAt }` with HTTP 201 | PASS | Line 78: `return c.json({ id, status: 'queued', createdAt: now }, 201)` |
| ID prefixed `req_` + short random string | PASS | Line 62: `req_${crypto.randomBytes(4).toString('hex')}` |
| Full DiligenceRequest written to SQLite before response | PASS | Line 75 `upsertRequest(req)` precedes line 78 response |
| `dispatchWorker(id)` called after record is persisted | PASS | Line 76 `dispatchWorker(id)` is after line 75 `upsertRequest(req)` |
| Missing required fields return 400 `{ error: string }` | PASS | Lines 25–29 cover targetBrief, objective, offer; enum checks cover tone/channel/goalType; array check covers focuses |
| Malformed JSON returns 400 `{ error: 'invalid json' }` | PASS | Lines 17–22 try/catch returns `{ error: 'invalid json' }` |
| Invalid enum values return 400 | PASS | Lines 32–40 validate channel, tone, goalType with descriptive error |
| Invalid focuses array items return 400 | PASS | Lines 46–49 filter invalid items and return 400 |
| `focuses` may be empty array | PASS | Empty `[]` passes the `invalidFocuses.length > 0` check |

### A4 — GET /requests

| Criterion | Status | Evidence |
|---|---|---|
| Returns JSON array sorted by createdAt DESC | PASS | db.ts line 27: `ORDER BY created_at DESC`; `listRequests()` called at requests.ts line 83 |
| Each item shape: `{ id, title, status, parsedHints, preferredChannel, updatedAt }` | PASS | requests.ts lines 84–91 map to RequestSummary interface exactly |
| Returns empty array when no records (not 404) | PASS | `listRequests()` returns `[]` for no rows; `c.json(summaries)` returns `[]` with 200 |
| `preferredChannel` read from `input.preferredChannel` | PASS | Line 89: `preferredChannel: r.input.preferredChannel` |
| `parsedHints` may be empty `[]` | PASS | Initial record has `parsedHints: []`; the mapping passes it through as-is |

### A5 — GET /requests/:id

| Criterion | Status | Evidence |
|---|---|---|
| Returns full DiligenceRequest as stored in SQLite | PASS | Line 99: `return c.json(req)` returns the full parsed object from db |
| `research` and `outreach` included if populated, omitted if not | PASS | These are optional fields in DiligenceRequest; JSON.stringify omits undefined fields; verified with node test |
| Returns HTTP 404 `{ error: 'not found' }` for unknown IDs | PASS | Line 98: `if (!req) return c.json({ error: 'not found' }, 404)` |
| Response Content-Type is application/json | PASS | Hono's `c.json()` sets `Content-Type: application/json` automatically |

---

## System-wide interaction chain assessment

1. **What fires when POST /requests runs?** Handler validates → `upsertRequest()` (synchronous DB write, better-sqlite3) → `dispatchWorker()` (sets up non-blocking setTimeout chain) → 201 response. Order is correct and deterministic.

2. **Do tests exercise the real interaction chain?** No automated test suite exists (CLAUDE.md confirms: "There is no test runner configured yet"). The plan.md documents manual curl verification commands. `tsc --noEmit` passes with zero errors. The codebase's stated quality gate is TypeScript compilation only. This is consistent with the project's current state.

3. **Can failure leave orphaned state?** `upsertRequest` is synchronous and completes before `dispatchWorker` is called. If `dispatchWorker` throws synchronously (which it cannot — it only calls `setTimeout`), the DB write is already committed. The `setTimeout` chain in `dispatchWorker` reads from DB on each step via `getRequest(id)`, so stale state cannot occur even if an intermediate step is interrupted. No orphaned state risk.

4. **What other interfaces expose this functionality?** `GET /requests` and `GET /requests/:id` both read from the same `db.ts` functions (`listRequests`, `getRequest`). The SSE route in `events.ts` also calls `getRequest`. All callers use the same synchronous prepared-statement layer — consistent.

5. **Error handling alignment across layers?** `db.ts` functions return `null` on miss (not thrown errors); `requests.ts` converts null to 404. `upsertRequest` uses INSERT OR REPLACE so duplicates (re-submissions) overwrite silently. This is consistent with the spec's "no deduplication" requirement.

---

## Required fixes before accept
None. The implementation satisfies all A3, A4, A5 acceptance criteria. The two important findings are cosmetic/UX and not blocking per spec.

---

## Verification notes

- `tsc --noEmit` runs clean with zero errors as of check time.
- File reviewed: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/routes/requests.ts`
- Supporting files reviewed: `server/src/db.ts`, `server/src/worker.ts`, `server/src/types.ts`, `server/src/index.ts`
- No imports from `../../../src/` (the frontend source) found anywhere in `server/src/`.
- The `server/` directory is entirely new (untracked in git); no existing production code was modified.
