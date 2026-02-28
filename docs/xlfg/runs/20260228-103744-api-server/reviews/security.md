# Security review

Run: `20260228-103744-api-server`

## Summary

The server is a Hono/TypeScript API over SQLite (better-sqlite3) with no authentication, intended for localhost MVP use only. The spec explicitly acknowledges the absence of auth and rate limiting. All SQL access uses parameterized prepared statements, and enum validation is applied to structured fields. The main risk surface is the combination of a wildcard CORS policy, unbounded string inputs, an unconstrained SSE fan-out registry, an unconstrained `focuses` array, path traversal via `DB_PATH`, and no rate limiting on the worker dispatch path. There are no authentication or authorization controls to review (explicitly out of scope per spec). No secrets are logged.

---

## Already covered by verification

- Enum validation for `preferredChannel`, `tone`, `goalType`, and `focuses` values — verified in verification rows 5–7.
- `focuses` must be an array and each element must be a known `ResearchFocus` string — verified in row 7.
- `GET /requests/:id` returns 404 for unknown IDs — verified in row 11.
- No frontend source imports in the server — verified in row 16.
- TypeScript strict-mode compilation passes cleanly (`npm run lint`).
- No SQL injection: all DB calls use better-sqlite3 prepared statements with bound parameters.

---

## Net-new findings

### P0 (blockers)

**P0-1 — Wildcard CORS with no restriction path in production**

File: `server/src/index.ts`, line 11–12

```typescript
const origin = process.env.CORS_ORIGIN || '*';
app.use('*', cors({ origin }));
```

`CORS_ORIGIN` defaults to `'*'` at startup. Hono's `cors()` middleware with `origin: '*'` also echoes `Access-Control-Allow-Credentials` as absent, but any future addition of cookie or credential-based auth would silently become exploitable from any origin. More critically for the current code: a wildcard CORS policy means any web page on any domain can make cross-origin requests to this server and read responses. Even though this is an MVP, the env-var guard provides false comfort — if `CORS_ORIGIN` is not set in a deployment, the server is fully open.

This is rated P0 because the spec itself notes: "In production this must be restricted to the frontend origin. A `CORS_ORIGIN` env var should be respected when present." The code does respect it when present, but there is no fail-safe. A misconfigured deploy with an unset var exposes all stored research/outreach data cross-origin.

**P0-2 — Arbitrary filesystem path via `DB_PATH` environment variable (path traversal)**

File: `server/src/db.ts`, line 6–9

```typescript
const dbPath = process.env.DB_PATH || path.join(import.meta.dirname, '..', 'data', 'outreachos.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
```

`DB_PATH` is consumed without any validation. An attacker who can set environment variables (e.g., via a compromised `.env` file, CI config, or container environment) can point the database path to any writable location on the filesystem, including `/etc/`, `/tmp/`, paths containing `..` sequences, NFS mounts, etc. `better-sqlite3` will open or create a file at any absolute path, and `fs.mkdirSync` will create intermediate directories recursively.

Combined with `INSERT OR REPLACE` semantics in `upsertRequest`, an adversary controlling `DB_PATH` could corrupt or overwrite any world-writable file on the system by making the server write SQLite binary data to it.

Fix: validate that the resolved path is within an allowed base directory (e.g., the project root) before opening the database.

---

### P1 (important)

**P1-1 — No input length limits on free-text fields; DoS via large payloads**

File: `server/src/routes/requests.ts`, lines 24–28

```typescript
for (const field of ['targetBrief', 'objective', 'offer'] as const) {
  if (typeof body[field] !== 'string' || !body[field]) {
    return c.json({ error: `${field} is required` }, 400);
  }
}
```

The spec explicitly defers length validation ("No length validation is required at MVP"), but there are no limits on `targetBrief`, `objective`, or `offer`. A single malicious POST with a multi-megabyte string body will: (a) be fully buffered by `c.req.json()` into memory, (b) be stored as a TEXT blob in SQLite, and (c) be re-read from SQLite and serialized in full on every `GET /requests` and `GET /requests/:id` call. The `GET /requests` list endpoint returns all records without pagination, so a handful of large records will cause unbounded memory allocation on every list call.

This is also an avenue to fill the SQLite file to the point of exhausting disk space.

**P1-2 — Unbounded `focuses` array**

File: `server/src/routes/requests.ts`, lines 42–48

```typescript
if (!Array.isArray(body.focuses)) {
  return c.json({ error: 'focuses must be an array' }, 400);
}
const invalidFocuses = (body.focuses as string[]).filter((f) => !FOCUSES.includes(f as ResearchFocus));
```

Each element is validated against the `FOCUSES` allowlist, but the array length is not bounded. A request with `focuses: [... 100,000 valid entries ...]` passes all validation, is stored in the JSON blob, and causes `Array.filter` to iterate over every element. The validation loop itself is O(n * m) because `Array.includes` is O(m) on the 5-element `FOCUSES` array. While not a meaningful complexity concern for small inputs, there is no ceiling.

**P1-3 — No rate limiting on `POST /requests` allows runaway worker dispatch**

File: `server/src/routes/requests.ts`, line 75; `server/src/worker.ts`, lines 41–108

```typescript
upsertRequest(req);
dispatchWorker(id);
```

`dispatchWorker` schedules a chain of six `setTimeout` callbacks per request. Each chain holds the request ID in its closure and reads from/writes to the database at each step. There is no concurrency cap on how many worker chains can be active simultaneously. A client sending 10,000 `POST /requests` in rapid succession will create 10,000 independent timer chains, each performing periodic SQLite reads and writes. This can exhaust both the event-loop timer queue and disk I/O capacity.

Similarly, `POST /requests/:id/redraft` calls `dispatchDraftStep`, and while the `ready`-only status gate prevents stacking redraft calls on the same ID, there is no guard against rapid-fire redrafts across multiple IDs.

**P1-4 — SSE listener registry has no per-connection limit (memory leak vector)**

File: `server/src/sse.ts`, lines 3–18

```typescript
const listeners = new Map<string, Set<SSEWriter>>();

export function addListener(requestId: string, writer: SSEWriter): () => void {
  if (!listeners.has(requestId)) {
    listeners.set(requestId, new Set());
  }
  listeners.get(requestId)!.add(writer);
  ...
}
```

The `listeners` map is process-global and grows without bound. Any number of clients can open `GET /requests/:id/events` connections to the same or different request IDs. Each connection adds a `SSEWriter` closure to the set. While the `onAbort` handler removes the writer on disconnect, there is no cap on simultaneous connections per request ID or total connections. A client that opens thousands of connections will allocate thousands of closures in memory.

Additionally, if a request never reaches a terminal state (e.g., a bug in the worker), connections for that request ID remain in the map indefinitely.

**P1-5 — `id` parameter from URL is passed to DB and SSE without format validation**

File: `server/src/routes/requests.ts`, line 96; `server/src/routes/events.ts`, line 10; `server/src/routes/redraft.ts`, line 13

```typescript
const req = getRequest(c.req.param('id'));
const id = c.req.param('id');
```

The `id` path parameter is passed directly to `getRequest` and `addListener` without checking that it matches the expected `req_[hex]` format. While better-sqlite3's prepared statement prevents SQL injection, an arbitrarily long or specially crafted `id` string (e.g., 1 MB, containing Unicode surrogates, or null bytes) is passed into the SQLite `WHERE` clause and into the `listeners` Map key. Enforcing a simple format check (e.g., `/^req_[0-9a-f]{8}$/`) at the route level is cheap and eliminates this entire class of concern.

**P1-6 — Error detail from JSON parse failure is swallowed but error message is generic — acceptable, however `c.req.json()` exception content is never inspected**

File: `server/src/routes/requests.ts`, lines 17–21; `server/src/routes/redraft.ts`, lines 20–24

```typescript
try {
  body = await c.req.json();
} catch {
  return c.json({ error: 'invalid json' }, 400);
}
```

The caught exception is discarded entirely (bare `catch` with no binding), so no internal error detail leaks. This is correct practice. Noted here only to confirm it was reviewed and is not a finding.

---

### P2 (nice to have)

**P2-1 — `DB_PATH` directory is created with default `fs.mkdirSync` permissions**

File: `server/src/db.ts`, line 9

```typescript
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
```

`fs.mkdirSync` uses the process `umask` to set directory permissions. On a system with a permissive umask (e.g., `0000`), the `server/data/` directory will be world-readable. The spec notes that "the `server/data/` directory should not be world-readable." The fix is to pass an explicit `mode` argument: `fs.mkdirSync(..., { recursive: true, mode: 0o700 })`.

**P2-2 — CORS wildcard also applies to the SSE endpoint**

File: `server/src/index.ts`, line 12

The global `app.use('*', cors({ origin }))` middleware applies the wildcard CORS policy to `/requests/:id/events`. A cross-origin page can open an EventSource to the SSE endpoint and receive all real-time research and outreach content. This is a direct consequence of P0-1 but deserves a separate note because SSE connections are long-lived and carry richer data (full `ResearchPacket` and `OutreachPacket` JSON) than the polling endpoints.

**P2-3 — `eventCounter` in `sse.ts` is a module-level mutable integer with no overflow guard**

File: `server/src/sse.ts`, line 20

```typescript
let eventCounter = 0;
```

In a long-running process, `eventCounter` increments without bound. JavaScript's `Number.MAX_SAFE_INTEGER` is `2^53 - 1`, so this will not overflow in practice, but the SSE `id:` field is sent as a string (`String(eventId)`) and grows in length over time. This is cosmetic rather than a security concern, but worth noting for completeness.

**P2-4 — No `X-Content-Type-Options` or other security headers**

The server sets no `X-Content-Type-Options: nosniff`, `X-Frame-Options`, or `Content-Security-Policy` headers. For an API server that returns only JSON, MIME-sniffing protection is not strictly necessary (no HTML is returned), but adding `X-Content-Type-Options: nosniff` is a one-line addition that eliminates any browser-side content sniffing risk on the JSON responses.

**P2-5 — `title` is populated from raw user input without sanitization**

File: `server/src/worker.ts`, line 73

```typescript
req.title = req.input.targetBrief.slice(0, 40);
```

`targetBrief` is stored verbatim from user input and the first 40 characters become `title`. The server returns this in `GET /requests` summaries and `GET /requests/:id` responses. Since the server never renders HTML, there is no server-side XSS risk. However, if the frontend renders `title` without escaping (in React this is handled by JSX by default), the risk is contained. This is noted as a documentation reminder for the frontend integration: always treat `title` as untrusted user content.

---

## Why verification did not catch net-new findings

The verification suite (`verification.md`) focused exclusively on functional correctness: do the endpoints return the right HTTP status codes and response shapes? It did not include:

1. A test for oversized request bodies (P1-1), which would require sending a multi-MB payload and measuring memory or timing.
2. A test for the maximum number of simultaneous SSE connections per request ID (P1-4).
3. A test for `POST /requests` flood with high concurrency to observe worker-chain accumulation (P1-3).
4. A test for non-`req_`-prefixed `:id` path parameters (P1-5), which would reveal the absence of format validation.
5. Filesystem tests for `DB_PATH` values containing `..` sequences (P0-2).
6. Directory permission checks after `mkdirSync` (P2-1).
7. Security header checks (P2-4).

The verification also predates this security review and correctly used the spec's functional acceptance criteria as its checklist, which did not include security test cases.

---

## Recommended fixes

Listed in priority order.

**Fix P0-1 — CORS hardening**

In `server/src/index.ts`, fail loudly if `CORS_ORIGIN` is not set and the `NODE_ENV` is not `development`:

```typescript
// server/src/index.ts
const origin = process.env.CORS_ORIGIN;
if (!origin) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('CORS_ORIGIN env var is required in non-development environments');
  }
  console.warn('[security] CORS_ORIGIN not set — defaulting to * (development only)');
}
app.use('*', cors({ origin: origin ?? '*' }));
```

**Fix P0-2 — Validate `DB_PATH` against an allowed base directory**

In `server/src/db.ts`, resolve the path and assert it is inside an expected base:

```typescript
import path from 'node:path';
import fs from 'node:fs';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const rawDbPath = process.env.DB_PATH || path.join(import.meta.dirname, '..', 'data', 'outreachos.db');
const dbPath = path.resolve(rawDbPath);

if (!dbPath.startsWith(PROJECT_ROOT + path.sep)) {
  throw new Error(`DB_PATH must be within the project root. Got: ${dbPath}`);
}
```

**Fix P1-1 — Add input length limits**

In `server/src/routes/requests.ts`, add length checks after the type checks:

```typescript
const MAX_BRIEF = 10_000;
const MAX_SHORT = 2_000;

if ((body.targetBrief as string).length > MAX_BRIEF) {
  return c.json({ error: 'targetBrief exceeds maximum length' }, 400);
}
if ((body.objective as string).length > MAX_SHORT) {
  return c.json({ error: 'objective exceeds maximum length' }, 400);
}
if ((body.offer as string).length > MAX_SHORT) {
  return c.json({ error: 'offer exceeds maximum length' }, 400);
}
```

**Fix P1-2 — Cap `focuses` array length**

```typescript
if (body.focuses.length > FOCUSES.length) {
  return c.json({ error: `focuses may contain at most ${FOCUSES.length} items` }, 400);
}
```

**Fix P1-3 — Add concurrency cap for worker dispatch**

Track the number of active worker chains with a module-level counter and reject new submissions when the cap is reached:

```typescript
// server/src/worker.ts
let activeWorkers = 0;
const MAX_WORKERS = 20;

export function dispatchWorker(id: string): void {
  if (activeWorkers >= MAX_WORKERS) {
    // Optionally mark the request as failed immediately
    return;
  }
  activeWorkers++;
  // ... existing advance() logic ...
  // Decrement in the final step or on error
}
```

**Fix P1-4 — Cap SSE connections per request ID**

In `server/src/sse.ts`:

```typescript
const MAX_LISTENERS_PER_ID = 10;

export function addListener(requestId: string, writer: SSEWriter): (() => void) | null {
  if (!listeners.has(requestId)) {
    listeners.set(requestId, new Set());
  }
  const set = listeners.get(requestId)!;
  if (set.size >= MAX_LISTENERS_PER_ID) {
    return null; // caller should respond with 429
  }
  set.add(writer);
  ...
}
```

**Fix P1-5 — Validate `:id` format at route entry**

Add a helper to all three route files that handle an `:id` parameter:

```typescript
const VALID_ID = /^req_[0-9a-f]{8}$/;

function validateId(id: string): boolean {
  return VALID_ID.test(id);
}
```

Call it at the top of each handler and return 400 if it fails.

**Fix P2-1 — Set explicit directory permissions**

```typescript
fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
```
