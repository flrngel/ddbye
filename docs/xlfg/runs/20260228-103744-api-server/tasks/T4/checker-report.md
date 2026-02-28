# Checker report

## Verdict
- ACCEPT

## Findings

### Blockers
- None.

### Important
- **Order-of-operations gap: 404 check fires before body is read.** The route reads the DB record first (line 14), then parses the body (lines 19-24), then validates the `tone`/`preferredChannel` fields. This ordering means a request with an unknown ID returns 404 even if the JSON body is malformed — which is the conventional behaviour and matches the spec table. However the spec lists the 400-for-empty-body check as a distinct error case; if the request does not exist, that 400 is never reached. This is consistent with the spec (404 takes priority), but it is worth noting for future maintainers.

- **`dispatchDraftStep` ignores the updated `input.tone` / `input.preferredChannel` when writing stub outreach.** `worker.ts` line 128 always writes `stubOutreach` (the fixed PG/HN stub) without consulting the updated fields. This is acceptable for the stub stage (Track B replaces it) but means the returned outreach content will never reflect the redrafted tone or channel at this stage. Not a contract violation because the spec says the stub uses seeded data, but it is a correctness gap that Track B must close.

- **`dispatchDraftStep` does not emit a `request.drafted` SSE event before `request.ready`.** The full `dispatchWorker` chain emits both `request.drafted` (with `outreach` payload) and then `request.ready`. `dispatchDraftStep` (worker.ts lines 120-137) skips directly to `request.ready`. The A7 spec does not explicitly require the intermediate `drafted` event on a redraft, but A6's event type table lists `request.drafted` as the event that carries the outreach packet. Clients subscribed to the SSE stream after a redraft will miss the outreach payload in the event stream and must do a GET to retrieve it. This is a minor deviation from the overall event contract, though not explicitly called out in A7. It does not block acceptance of T4 in isolation but should be noted for the integration review.

### Nice-to-have
- Inline validation of `tone` and `preferredChannel` enum values is already implemented (lines 32-44) — this is stricter than the minimum A7 requirement and is a good defensive addition.
- The `updatedAt` timestamp is set to `new Date().toISOString()` on the mutated `req` object before `upsertRequest` is called, so the value returned in the 202 response body is guaranteed to match what is persisted.

## Required fixes before accept
- None. All A7 acceptance criteria are met. The gaps noted under Important are either within-spec trade-offs or stub-stage limitations that Track B is expected to address.

## Verification notes

### Criterion-by-criterion evidence

| Criterion | Status | Evidence |
|---|---|---|
| Accepts `{ tone?, preferredChannel? }`, at least one required | PASS | `redraft.ts` lines 26-29: destructures both optional fields, returns 400 if both absent |
| 400 if status != `ready` | PASS | `redraft.ts` line 17: `if (req.status !== 'ready') return c.json({ error: 'request not ready' }, 400)` |
| 404 for unknown IDs | PASS | `redraft.ts` line 16: `if (!req) return c.json({ error: 'not found' }, 404)` |
| Updates `input.tone` / `input.preferredChannel` | PASS | `redraft.ts` lines 36, 43: mutates `req.input.tone` and `req.input.preferredChannel` respectively, guarded by presence check |
| Sets status to `drafting` | PASS | `redraft.ts` line 46: `req.status = 'drafting'` |
| Updates `updatedAt` | PASS | `redraft.ts` line 47: `req.updatedAt = new Date().toISOString()` |
| Writes to SQLite before calling dispatch | PASS | `redraft.ts` lines 49-50: `upsertRequest(req)` called before `dispatchDraftStep(id)` |
| Calls `dispatchDraftStep(id)` | PASS | `redraft.ts` line 50: explicit call |
| Returns 202 `{ id, status: 'drafting', updatedAt }` | PASS | `redraft.ts` line 52: `c.json({ id: req.id, status: 'drafting', updatedAt: req.updatedAt }, 202)` |
| Error body for no fields: `{ error: 'tone or preferredChannel required' }` | PASS | `redraft.ts` line 29: matches spec exactly |
| Error body for unknown ID: `{ error: 'not found' }` | PASS | `redraft.ts` line 16: matches spec exactly |
| Error body for wrong status: `{ error: 'request not ready' }` | PASS | `redraft.ts` line 17: matches spec exactly |

### Interaction chain trace

1. `POST /requests/:id/redraft` arrives at `index.ts` → routed via `app.route('/requests', redraftRoutes)` (index.ts line 20).
2. Hono matches `/:id/redraft` in `redraft.ts` line 12.
3. `getRequest(id)` executes a prepared synchronous SQLite SELECT (db.ts lines 26, 33-37). Returns parsed `DiligenceRequest` or `null`.
4. Status and existence guards fire synchronously before any await.
5. Body is parsed asynchronously with `c.req.json()` (line 21); malformed JSON is caught and returns 400.
6. Enum validation is synchronous (lines 32-44).
7. `upsertRequest(req)` executes a prepared synchronous SQLite INSERT OR REPLACE (db.ts lines 28-31, 44-52) — fully persisted before `dispatchDraftStep` is called.
8. `dispatchDraftStep(id)` schedules a single `setTimeout` (worker.ts line 122). The handler re-reads the record from SQLite so it picks up the updated `input.tone` / `input.preferredChannel` — though `stubOutreach` is always returned regardless.
9. The 202 response is sent immediately; the draft step runs asynchronously after ~2 s.

No orphaned state risk: if the process restarts between steps 7 and 8, the request is already in SQLite with `status: 'drafting'`. The timeout will not fire, but the record is consistent. A future Track B implementation should handle crash recovery (e.g., re-queue all `drafting` requests on startup). This is out of scope for T4.

### Scope compliance
Only `server/src/routes/redraft.ts` was created. No other files were modified. All dependencies (`db.ts`, `worker.ts`, `types.ts`) were already in scope for the overall Track A task and existed prior to T4.
