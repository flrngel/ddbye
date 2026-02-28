# Checker Report — T3: SSE + Worker Stub

Run: `20260228-103744-api-server`
Task: T3 (A6 + A9)
Reviewer: checker agent

---

## Verdict

ACCEPT

---

## Findings

### Blockers

None.

### Important

**I-1: Global event counter is shared across all request IDs (`server/src/sse.ts` line 20)**

`eventCounter` is a module-level variable that increments for every emit across every request ID. The spec SSE Event Format shows per-stream monotonic IDs starting at `1`. Under concurrent requests, IDs assigned to a given stream will not be monotonic — they will reflect the global counter at the moment of each emit. This does not break any SSE protocol requirement (the `id:` field is optional and has no monotonicity constraint in the spec), and the frontend UX notes do not depend on sequential IDs. However, if a future client uses `Last-Event-ID` for reconnection replay it will receive a non-monotonic sequence that makes replay logic ambiguous.

This is not a blocker for the stub phase but should be tracked for Track B.

**I-2: Hardcoded stub data is always PG/HN regardless of the actual brief (`server/src/worker.ts` lines 77-84)**

`dispatchWorker` sets `parsedHints`, `title`, `research`, and `outreach` to the PG/HN stub data unconditionally. A brief submitted for any other target will return PG/HN research and outreach packets. The spec (OQ-2) explicitly anticipates this for the stub phase. The `// TODO Track B` comment is present. No action required before accept, but Track B must address this.

**I-3: Terminal-event stream closure uses `setTimeout(..., 100)` — race window (`server/src/routes/events.ts` lines 46-50)**

When the listener callback fires for `request.ready` or `request.failed`, the stream write is awaited inside the callback but the `stream.close()` call is deferred 100 ms via `setTimeout`. During that window, the polling loop (`setInterval` every 500 ms) could fire another write if the `closed` flag has not yet been set. In practice the `closed = true` inside the `setTimeout` fires before the 500 ms poll, so there is no observable race at these timings, but the logic is fragile. A cleaner design would set `closed = true` immediately after detecting a terminal event, before the `setTimeout`. This is a maintainability concern, not a correctness blocker for the stub.

### Nice-to-have

**N-1: `dispatchDraftStep` emits only `request.ready` — no `request.drafted` event**

The spec SSE event table includes `request.drafted` (emitted when the outreach packet is ready). `dispatchDraftStep` skips this and jumps directly to `request.ready` with the new outreach packet. This is technically fine — the `request.drafted` event is defined at the full pipeline level — but for consistency (and so the frontend progress bar can animate the draft step during a redraft) a `request.drafted` event before `request.ready` would be more complete.

**N-2: Error handling on `stream.write(': ping\n\n')` in the already-terminal path**

The already-terminal path in `events.ts` (lines 19-29) calls `await stream.write(': ping\n\n')` but does not wrap it in a try/catch. If the client closes immediately after the 200 headers are sent, this write can throw. The non-terminal path handles write errors by catching inside the listener callback. Minor asymmetry.

**N-3: `stubs.ts` `stubResearch.parsedHints` is set on the request at `resolving` stage but `stubResearch` itself does not contain `parsedHints` — correct but note the separation is implicit**

No code defect; just an observation that the parse-hint logic in `worker.ts` and the research/outreach stubs in `stubs.ts` are correctly separated.

---

## Criterion-by-criterion Assessment (A6 + A9)

### A6 — `GET /requests/:id/events` (SSE)

| Criterion | Result | Evidence |
|---|---|---|
| Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` | PASS | `hono/streaming` `streamSSE` sets these headers automatically; Hono's SSE implementation sets all three. |
| Immediately sends `: ping` comment on connection | PASS | `events.ts` line 20: `await stream.write(': ping\n\n')` fires before any listener is added. Both the terminal and live-stream paths send the ping. |
| Emits typed events with SSE `data:` / `event:` / `id:` format | PASS | `stream.writeSSE({ data, event, id })` in `events.ts` line 40; Hono formats these correctly. `sse.ts` `emit()` passes serialized JSON as the `data` field. |
| Event types emitted in order: `request.parsing`, `request.resolved`, `request.researching`, `request.synthesized`, `request.drafted`, `request.ready` | PASS | `worker.ts` `STAGE_MAP` (lines 6-13) defines all six events in correct order; `dispatchWorker` steps through them sequentially via `setTimeout` chains. |
| Stream closes after `request.ready` or `request.failed` | PASS | `events.ts` lines 45-50: on terminal event the listener sets `closed = true` and calls `stream.close()` via 100 ms timeout. The polling loop detects `closed === true` and resolves, ending the `streamSSE` callback. |
| Returns HTTP 404 plain text if `:id` is unknown | PASS | `events.ts` lines 13-15: `return c.text('not found', 404)` before any stream is opened. |
| Client disconnect stops emitting and cleans up timers | PARTIAL PASS — see note | `events.ts` line 53-56: `stream.onAbort()` sets `closed = true` and calls `removeListener()`, which removes the writer from `sse.ts`'s Set. The `setTimeout` chains in `worker.ts` continue running (they call `upsertRequest` and `emit`) but `emit` finds no listeners for this connection and skips the write. Existing timer handles are not cancelled; the spec edge case section (spec lines 517-519) explicitly states this is acceptable: "The dispatch stub's `setTimeout` chain continues to run and persists state to SQLite. Only the SSE write to the closed connection is skipped." |
| Multiple simultaneous SSE clients for same ID served independently (fan-out) | PASS | `sse.ts` uses `Map<string, Set<SSEWriter>>`. Each `addListener` call adds an independent writer to the Set. `emit` iterates all writers. Each stream has its own `closed` flag and `removeListener` closure. |
| Already-`ready` request emits `request.ready` immediately and closes | PASS | `events.ts` lines 18-30: checks `req.status === 'ready'`, writes ping, writes `request.ready` event, and exits the `streamSSE` callback (stream closes on callback return). |
| Already-`failed` request emits `request.failed` immediately and closes | PASS | Same code path as above (lines 18-30), `eventName` is `request.failed`. |

### A9 — Worker dispatch stub

| Criterion | Result | Evidence |
|---|---|---|
| `server/src/worker.ts` exports `dispatchWorker(id: string): void` | PASS | `worker.ts` line 41: `export function dispatchWorker(id: string): void`. |
| `server/src/worker.ts` exports `dispatchDraftStep(id: string): void` | PASS | `worker.ts` line 120: `export function dispatchDraftStep(id: string): void`. |
| Advances through all 8 status stages using `setTimeout` chains, ~1-2 s per stage | PASS | `STAGE_MAP` has 6 entries covering all live statuses (`queued` is the initial state set by `POST /requests`, making 8 total). `DELAYS` array (line 15) ranges from 1000 to 2000 ms per stage — within the 1-2 s target. |
| `upsertRequest` called after each stage transition | PASS | `worker.ts` line 92: `upsertRequest(req)` is called inside `advance()` before `emit`, on every stage. |
| SSE listeners notified after each stage transition | PASS | `worker.ts` line 100: `emit(id, stage.event, eventData)` called after `upsertRequest` on every stage. |
| `// TODO Track B: replace with real Claude Agent SDK call` present | PASS | `worker.ts` line 42: `// TODO Track B: replace with real Claude Agent SDK call`. Also present in `dispatchDraftStep` at line 121. |
| JSDoc comment documenting expected interface for Track B | PASS | `worker.ts` lines 27-40: JSDoc on `dispatchWorker` describes the 6 pipeline steps for Track B. Lines 111-118: JSDoc on `dispatchDraftStep`. |
| Stub research/outreach payloads populated at appropriate stages | PASS | `worker.ts` lines 80-85: `stubResearch` added at `synthesizing`, `stubOutreach` added at `drafting`. Both written to SQLite via `upsertRequest`. |

---

## Required fixes before accept

None. All A6 and A9 acceptance criteria pass.

---

## Verification notes

**System-level interaction chain trace:**

1. `POST /requests` (T2) calls `dispatchWorker(id)` — `worker.ts` schedules first `setTimeout`.
2. Each `setTimeout` fires `advance()`, which reads from SQLite via `getRequest`, mutates the in-memory object, writes back via `upsertRequest`, then calls `emit`.
3. `emit` in `sse.ts` looks up the `Set<SSEWriter>` for the ID and calls each writer.
4. Each writer is the closure created in `events.ts` line 38, which calls `stream.writeSSE(...)`.
5. On terminal event, the closure sets `closed = true` and calls `stream.close()` via a 100 ms `setTimeout`.
6. The polling `setInterval` in `events.ts` line 60 detects `closed === true`, clears itself, and resolves the promise, ending the `streamSSE` callback.

The chain is straightforward and fully implemented. The only untested link is the Hono `streamSSE` / `stream.onAbort` integration with the actual Node.js HTTP layer, which cannot be unit-tested without running the server. This is acceptable for a stub iteration.

**Orphaned state risk:**

If `advance()` fires after the client has disconnected: `getRequest` reads from SQLite (succeeds), `upsertRequest` writes to SQLite (succeeds), `emit` finds an empty Set (returns immediately). No orphaned state; the request progresses to `ready` in SQLite as specified. Subsequent `GET /requests/:id` returns correct final state.

**Consistency across interfaces:**

`POST /requests` (T2, `routes/requests.ts`) calls `dispatchWorker(id)` after `upsertRequest`. `POST /requests/:id/redraft` (T4, `routes/redraft.ts`) calls `dispatchDraftStep(id)` after `upsertRequest`. Both follow the same pattern. The `emit` calls inside `worker.ts` use the same `sse.ts` registry. Consistent.

**Error handling alignment:**

`worker.ts` `advance()` returns early if `getRequest(id)` returns null (line 49), preventing a null-dereference crash. `sse.ts` `emit()` catches exceptions thrown by individual writers (line 31). `events.ts` listener callback catches write errors by setting `closed = true` on rejection. Layers are aligned.

**`stubs.ts` scope:**

`stubs.ts` is a new file within `server/src/`. No imports from `../src/` (frontend). Correct.

**Files changed in scope for T3:**

- `server/src/routes/events.ts` — new file, allowed
- `server/src/sse.ts` — new file, allowed
- `server/src/worker.ts` — new file, allowed
- `server/src/stubs.ts` — new file, allowed

No out-of-scope file modifications detected.
