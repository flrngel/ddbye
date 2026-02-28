# Compound Summary — API Server (Track A)

Run: `20260228-103744-api-server`

## What was learned

1. **Hono + @hono/node-server is excellent for TypeScript API servers** — zero-config SSE via `streamSSE`, built-in CORS middleware, clean routing. Much less boilerplate than Express.

2. **better-sqlite3 synchronous API removes entire classes of async bugs** — no race conditions, no Promise chains for DB access. WAL mode provides read concurrency for free.

3. **SSE fan-out needs a listener registry** — `Map<string, Set<writer>>` pattern works for single-process. Redis pub/sub needed for horizontal scaling.

4. **Security review caught real issues even in MVP code** — CORS wildcard without NODE_ENV guard and DB_PATH traversal were both low-effort fixes with high value. Always run security review.

5. **Checker agents found genuine code quality issues** — duplicate imports, WAL sidecar gitignore, stub behavior gaps. Independent review works.

## What to reuse next time

- Hono + better-sqlite3 + tsx setup as a template for new Node API servers
- SSE listener registry pattern (`sse.ts`)
- The "stub dispatch with setTimeout chains" pattern for simulating async workflows
- Security review checklist: CORS, env var injection, input bounds, connection limits

## What to avoid

- Don't use `writeSSE` for SSE comment lines (`: ping`) — use `stream.write` directly
- Don't duplicate validation arrays across route files — extract to a shared constants file for Track B
- Don't forget WAL sidecar files (`*.db-shm`, `*.db-wal`) in `.gitignore`
