# Checker Report — T1: Foundation

## Verdict
ACCEPT (with noted non-blockers)

---

## Findings

### Blockers
None.

### Important

**I1 — WAL sidecar files not covered by `.gitignore`**
File: `server/.gitignore` line 3
The gitignore entry `data/*.db` covers `outreachos.db` but does NOT cover WAL sidecar files `outreachos.db-shm` and `outreachos.db-wal`. These files are created by SQLite whenever WAL mode is active (confirmed present in `server/data/` at time of review). A developer running `git add server/` would accidentally stage these binary files. The spec states (Security section): "A `.gitignore` entry for `server/data/*.db` must be present to prevent accidental DB commits." The intent clearly covers all DB runtime files.

Recommended fix: change line 3 of `server/.gitignore` from:
```
data/*.db
```
to:
```
data/*.db
data/*.db-shm
data/*.db-wal
```

**I2 — Global SSE event counter (cosmetic but worth knowing)**
File: `server/src/sse.ts` lines 20, 25, 29
`eventCounter` is a module-level monotonic integer shared across all request IDs. SSE `id:` values sent to different request streams are not independent per-request sequences; they interleave as a global counter. This does not break correctness for the MVP (single-process, SSE reconnection is not a tested scenario), but it means a client reconnecting with `Last-Event-ID` would see a gap even if no events were missed for their specific request. Per the spec this is a stub implementation, so this is acceptable for now.

### Nice-to-have

**N1 — `makeDefaultRun` is exported from `worker.ts`**
File: `server/src/worker.ts` line 139, `server/src/routes/requests.ts` line 5
`makeDefaultRun` is a pure data factory function that has no coupling to the dispatch logic. Exporting it from the worker module creates an artificial dependency from the routes layer to the worker module. This is not a bug, but when Track B replaces the worker, this import could create friction. Moving `makeDefaultRun` to `types.ts` or a small `utils.ts` would clarify ownership.

**N2 — Stub `parsedHints` and `title` are hardcoded to PG/HN regardless of input**
File: `server/src/worker.ts` lines 73-79
The dispatch stub sets `title = 'Paul Graham / Hacker News'` and `parsedHints = ['PG', 'Hacker News', 'search']` for all requests during the resolving stage, regardless of the actual brief. This is expected behavior for a stub (spec OQ-4), but a comment noting "generic brief gets PG/HN defaults until Track B replaces this" would reduce future confusion.

---

## Criterion-by-criterion verification

### A1 — Init server package

| Criterion | Result | Evidence |
|---|---|---|
| `server/package.json` exists with `dev` and `build` scripts | PASS | `"dev": "tsx watch src/index.ts"`, `"build": "tsc"` present |
| `tsconfig.json` targets ESNext, strict mode, `moduleResolution: bundler` | PASS | `"target": "ESNext"`, `"strict": true`, `"moduleResolution": "bundler"` |
| Port configurable (default 3001) | PASS | `parseInt(process.env.PORT \|\| '3001', 10)` in `index.ts` line 22 |
| `GET /health` returns `{ ok: true }` with 200 | PASS | `app.get('/health', (c) => c.json({ ok: true }))` in `index.ts` line 15 |
| No imports from `../src/` anywhere | PASS | Grep returned no matches across all `server/src/` files |

### A2 — Shared types

| Criterion | Result | Evidence |
|---|---|---|
| All domain types present in `server/src/types.ts` | PASS | `Channel`, `Tone`, `GoalType`, `ResearchFocus`, `RequestInput`, `EvidenceItem`, `ResearchCard`, `ResearchPacket`, `Deliverable`, `OutreachPacket`, `DiligenceRequest` all present |
| `RequestStatus` is the 8-state union | PASS | Lines 12-20: all 8 states present (`queued`, `parsing`, `resolving`, `researching`, `synthesizing`, `drafting`, `ready`, `failed`) |
| `RunStageStatus` is `'queued' \| 'running' \| 'done'` | PASS | Line 22: exact match |
| Types compile cleanly under `tsc --noEmit` strict mode | PASS | `npm run lint` exits 0 with no output |

### A8 — Persistence layer

| Criterion | Result | Evidence |
|---|---|---|
| `server/src/db.ts` initializes `better-sqlite3` at `DB_PATH` env var (default `server/data/outreachos.db`) | PASS | Line 6: `process.env.DB_PATH \|\| path.join(import.meta.dirname, '..', 'data', 'outreachos.db')` |
| `CREATE TABLE IF NOT EXISTS requests` with correct columns | PASS | Lines 16-24: `id TEXT PRIMARY KEY`, `status TEXT NOT NULL`, `data TEXT NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`. Verified against live DB via `PRAGMA table_info(requests)` |
| `getRequest(id)` returns parsed `DiligenceRequest` or `null` | PASS | Lines 33-37 |
| `listRequests()` returns all rows sorted by `created_at DESC` | PASS | Lines 39-42, `ORDER BY created_at DESC` in prepared statement |
| `upsertRequest(req)` serializes and writes full object | PASS | Lines 44-52, `INSERT OR REPLACE` with `JSON.stringify(req)` |
| All DB calls synchronous | PASS | `better-sqlite3` is synchronous by design; no `async`/`await` in `db.ts` |
| WAL mode enabled at startup | PASS | Line 14: `db.pragma('journal_mode = WAL')`. Verified: `PRAGMA journal_mode` returns `"wal"` on the live DB |
| `.gitignore` entry for `data/*.db` present | PASS (partial) | Entry exists; but WAL sidecar files `*.db-shm`/`*.db-wal` not covered — see I1 |

---

## Required fixes before accept

None are blocking acceptance. The implementation satisfies all hard acceptance criteria for A1, A2, and A8 and compiles cleanly. The one important item (I1 — WAL sidecar files in `.gitignore`) should be addressed in a follow-up commit before the first `git add` of the server directory, but does not block this task.

---

## Verification notes

- `npm run lint` (`tsc --noEmit`) executed in `server/` — exits 0, no errors or warnings.
- No imports matching `../src/` found across all files under `server/src/`.
- Live SQLite DB at `server/data/outreachos.db` confirmed: WAL journal mode active, `requests` table schema matches spec exactly.
- `server/data/.gitkeep` present as required by file structure spec.
- Route files (`requests.ts`, `events.ts`, `redraft.ts`) and supporting files (`sse.ts`, `stubs.ts`, `worker.ts`) reviewed; no issues found relating to A1/A2/A8 scope.
- The `id` format uses `req_` + 8 hex chars (e.g., `req_ec44e1f8`). Spec example shows 7 chars but spec prose says "short random string" — this is acceptable.
