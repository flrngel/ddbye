# Architecture review

Run: `20260228-103744-api-server`
Reviewer: architecture-reviewer agent
Date: 2026-02-28

---

## Summary

The Track A server is a clean, minimal Hono + SQLite API covering all spec acceptance criteria. Module boundaries are appropriate for a single-process stub, the type system is internally consistent, and the Track B seam (worker dispatch) is clearly marked. No P0 blockers exist for the stub phase. Several P1 issues would create real integration friction when Track B replaces the timer-based dispatch, and a few P2 items affect long-term maintainability.

---

## Already covered by verification

- All acceptance criteria A1–A9 are exercised by the verification curl suite and marked GREEN.
- `tsc --noEmit` passes, confirming the type system compiles cleanly.
- No imports from `../src/` (frontend) exist in the server tree.
- SSE fan-out, terminal-state fast-path, and client-disconnect cleanup are all confirmed working.
- Enum validation for `Channel`, `Tone`, `GoalType`, and `ResearchFocus` is confirmed.
- SQLite WAL mode, `DB_PATH` env override, and `CREATE TABLE IF NOT EXISTS` are confirmed.

---

## Net-new findings

### P0 (blockers)

None. The stub phase has no blockers.

---

### P1 (important)

**P1-1 — Global mutable `eventCounter` in `sse.ts` is not connection-scoped; counter state leaks across restarts via in-memory state but resets to `0` on process restart, creating duplicate SSE `id:` values for reconnecting clients.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/sse.ts`, line 20.

```ts
let eventCounter = 0;
```

The SSE specification says event IDs should allow clients to resume from the last-seen ID via `Last-Event-ID` header. The current counter restarts at 0 after every process restart. A reconnecting client that sends `Last-Event-ID: 5` will receive events starting at `id: 1` again with no replay mechanism. When Track B introduces real workloads, clients that reconnect mid-pipeline will silently miss events. Fix: persist the last-seen event ID per request in SQLite, or use a timestamp-based ID (e.g., `${Date.now()}`).

---

**P1-2 — The SSE stream keep-alive loop in `events.ts` uses a 500 ms polling interval on a Promise; this is busy-waiting rather than a proper backpressure mechanism and will not scale beyond a handful of concurrent connections.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/routes/events.ts`, lines 59–67.

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

Each open SSE connection holds one 500 ms interval timer. At 200 concurrent connections that is 200 timers firing every 500 ms. The correct pattern is a single `Promise` that the `removeListener`/`onAbort` callbacks resolve directly. This avoids timer overhead entirely. Acceptable for the stub phase, but should be addressed before Track B introduces real agent runs that may stay open for minutes.

Suggested replacement pattern:

```ts
await new Promise<void>((resolve) => {
  const done = () => { closed = true; resolve(); };
  stream.onAbort(() => { removeListener(); done(); });
  // writer sets `closed = true` and calls resolve via a stored ref
});
```

---

**P1-3 — The worker in `worker.ts` hardcodes resolved title and `parsedHints` to PG/Hacker News values regardless of the actual input brief, creating a silent correctness hazard that will confuse Track B integration testing.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/worker.ts`, lines 76–79.

```ts
if (stage.status === 'resolving') {
  req.parsedHints = ['PG', 'Hacker News', 'search'];
  req.title = 'Paul Graham / Hacker News';
}
```

Every request submitted, regardless of `targetBrief`, will resolve to "Paul Graham / Hacker News". The spec (OQ-4) acknowledges this is a stub, but the issue is that the hardcoded values are indistinguishable from real resolved data in the DB and in SSE events. When Track B attaches a real resolver, the DB will contain a mix of stub and real records with no marker to tell them apart. Fix: add a `_stub: true` flag to parsedHints or keep a `simulatedAt` field on `DiligenceRequest`, or at minimum truncate the actual brief for the title (already done at `parsing` stage, line 73) and emit `['stub']` for parsedHints.

---

**P1-4 — `dispatchDraftStep` in `worker.ts` does not reset the `draft` stage's `RunStage.status` back to `running` before emitting `request.ready`; it jumps directly to all-done, meaning SSE clients watching a redraft will never see a `drafting` run-stage animation.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/worker.ts`, lines 120–137.

```ts
export function dispatchDraftStep(id: string): void {
  setTimeout(() => {
    const req = getRequest(id);
    if (!req) return;

    req.status = 'ready';
    req.updatedAt = new Date().toISOString();
    req.outreach = stubOutreach;

    for (const s of req.run) {
      s.status = 'done';
    }

    upsertRequest(req);
    emit(id, 'request.ready', { id: req.id, status: 'ready' });
  }, 2000);
}
```

The spec says `POST /requests/:id/redraft` sets status to `drafting` (line 46 of `redraft.ts`), and Track B's `dispatchDraftStep` is supposed to emit a `request.drafted` event before `request.ready`. The current implementation skips that intermediate event. The redraft route correctly sets `status = 'drafting'` in the DB, but the SSE stream jumps from silence to `request.ready`. An SSE subscriber opened after the redraft POST will receive only the terminal event with no intermediate progression. This also means the `run[draft].status` never transitions to `running`, breaking any frontend that renders the stage pipeline during redraft.

---

**P1-5 — The validation arrays in `routes/requests.ts` are duplicated verbatim in `routes/redraft.ts`, creating two sources of truth for enum membership.**

`routes/requests.ts` lines 7–10:
```ts
const CHANNELS: Channel[] = ['email', 'linkedin', 'x_dm'];
const TONES: Tone[] = ['respectful', 'direct', 'warm'];
```

`routes/redraft.ts` lines 6–7:
```ts
const CHANNELS: Channel[] = ['email', 'linkedin', 'x_dm'];
const TONES: Tone[] = ['respectful', 'direct', 'warm'];
```

If a new channel or tone variant is added to `types.ts`, a developer must update both route files manually. TypeScript will not catch the omission because the arrays are typed as `Channel[]` (not `readonly [...]` as a const tuple). Fix: export a `VALID_CHANNELS`, `VALID_TONES`, etc. from `types.ts` or a shared `constants.ts`, and import in both routes.

---

**P1-6 — The `db.ts` module initializes the database and prepares statements at module load time (top-level side effects), making it impossible to unit-test route handlers with an in-memory or test-path DB without modifying module internals.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/db.ts`, lines 6–31.

```ts
const dbPath = process.env.DB_PATH || path.join(import.meta.dirname, '..', 'data', 'outreachos.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS requests ...`);
const stmtGet = db.prepare('SELECT data FROM requests WHERE id = ?');
```

The DB_PATH env var does allow test paths, but only if set before the module is imported. Because ESM modules are cached after first import, re-configuration mid-process is not possible. This is acceptable for the stub, but makes automated integration tests that need fresh DB state require process-level isolation (separate Jest worker processes, or `--experimental-vm-modules` isolation). A factory function pattern — `createDb(path)` returning `{ getRequest, listRequests, upsertRequest }` — would allow injection.

---

### P2 (nice to have)

**P2-1 — `moduleResolution: "bundler"` in `tsconfig.json` is not correct for a Node.js server; `"node16"` or `"nodenext"` is the appropriate setting.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/tsconfig.json`, line 6.

```json
"moduleResolution": "bundler"
```

`"bundler"` is designed for Vite/webpack consumers where the bundler resolves `.js` extensions automatically. In Node.js ESM with `"type": "module"` in `package.json`, `"bundler"` can hide missing `.js` extension errors that only manifest at runtime. `"node16"` enforces explicit `.js` imports, which the codebase already does correctly (e.g., `import ... from './db.js'`). This is low-risk because the imports are already using `.js` suffixes, but the setting is semantically wrong for a server.

---

**P2-2 — The `stubs.ts` file contains only PG/HN data, but the spec notes that the a16z seeded case also exists in the frontend. When Track B begins parallel development, test coverage for different target archetypes requires at least two stub shapes.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/stubs.ts`.

The single stub makes it impossible to test that the frontend correctly renders different `ResearchPacket` shapes (e.g., organization-focused vs person-focused). Adding a second named export (e.g., `stubResearchA16z`, `stubOutreachA16z`) would enable the worker to select a stub based on brief content, which also partially addresses P1-3.

---

**P2-3 — The SSE terminal-state fast-path in `events.ts` uses a hardcoded error string `'unknown failure'` for the failed status rather than reading any stored error message from the DB.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/routes/events.ts`, line 23.

```ts
if (req.status === 'failed') eventData.error = 'unknown failure';
```

The `DiligenceRequest` type does not have an `error` field, so there is nowhere to store a failure reason. When Track B adds real agent calls that can fail with specific error messages, there is no pathway to surface that message to the client via SSE replay. Fix: add an optional `error?: string` field to `DiligenceRequest` in `types.ts`, populate it in the worker on failure, and read it here instead of hardcoding.

---

**P2-4 — There is no `start` script in `package.json` for running the compiled output; only `dev` (tsx watch) and `build` (tsc) exist. Production use after `npm run build` requires knowing to run `node dist/index.js` manually.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/package.json`.

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "lint": "tsc --noEmit"
}
```

Adding `"start": "node dist/index.js"` is the conventional expectation and removes ambiguity for Track B developers and any CI that might build and run the server.

---

**P2-5 — The `listRequests` DB function returns full `DiligenceRequest` objects including the `research` and `outreach` blobs, then the route handler projects them to `RequestSummary`. The full blob deserialization is wasted work for the list endpoint.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/db.ts`, lines 39–42, and `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-a/server/src/routes/requests.ts`, lines 81–91.

```ts
// db.ts
export function listRequests(): DiligenceRequest[] {
  const rows = stmtList.all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as DiligenceRequest);
}

// routes/requests.ts
const all = listRequests();
const summaries: RequestSummary[] = all.map((r) => ({ ... }));
```

For the stub phase with small payloads this does not matter. At scale, when `research` and `outreach` packets are multi-kilobyte Claude outputs, deserializing every blob for a list call becomes expensive. A separate `listRequestSummaries()` function that either stores summary columns separately or uses SQLite JSON extraction (`json_extract(data, '$.title')`) would avoid this. Not urgent until Track B generates real payloads.

---

## Why verification did not catch net-new findings

The verification suite is a black-box integration test (curl-based). It confirms the external HTTP contract but does not:

- Inspect SSE `id:` continuity across process restarts (P1-1).
- Measure timer overhead at concurrency (P1-2).
- Submit non-PG briefs and assert that resolved title/hints reflect actual input (P1-3).
- Open an SSE stream during a redraft and assert intermediate `request.drafted` event is emitted (P1-4).
- Statically audit enum array duplication across route files (P1-5).
- Exercise DB initialization in isolation from the running process (P1-6).
- Inspect tsconfig semantic correctness (P2-1).
- Assert error field propagation for failed requests (P2-3).

---

## Suggested refactors

1. **Extract shared constants.** Move `CHANNELS`, `TONES`, `GOAL_TYPES`, `FOCUSES` arrays out of route files into a `server/src/constants.ts` module, imported by both `routes/requests.ts` and `routes/redraft.ts`. Eliminates P1-5.

2. **Replace SSE polling loop with promise-based close signaling.** Store the `resolve` callback from the keep-alive Promise in a local variable that `removeListener` and `onAbort` call directly, removing the 500 ms interval timer. Eliminates P1-2.

3. **Add `error?: string` to `DiligenceRequest`.** One-line addition to `server/src/types.ts` and the corresponding frontend `src/types.ts` when the frontend integrates. Allows real failure messages from Track B to propagate cleanly. Eliminates P2-3.

4. **Change `moduleResolution` to `"node16"`.** One-line `tsconfig.json` change. Correct semantics for the ESM Node environment. Addresses P2-1.

5. **Add `"start": "node dist/index.js"` to `package.json` scripts.** Trivial. Addresses P2-4.

6. **Add a second stub export in `stubs.ts`.** Add `stubResearchGeneric` and `stubOutreachGeneric` (or a16z variant) so the worker can vary its output by brief content, making stub results distinguishable from each other and partially addressing P1-3.

7. **Use timestamp-based SSE event IDs.** Replace the global `eventCounter` with `Date.now()` or a per-request sequence stored in the DB, enabling correct `Last-Event-ID` replay semantics. Addresses P1-1.
