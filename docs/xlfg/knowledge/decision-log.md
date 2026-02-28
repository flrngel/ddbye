# Decision Log

Architectural and design decisions with rationale.

## 2026-02-28 — API framework: Hono over Express

**Decision**: Use Hono instead of Express for the API server.
**Rationale**: Built-in SSE streaming (`streamSSE`), CORS middleware, TypeScript-native, smaller footprint. Express would require additional packages for SSE and type safety.
**Run**: 20260228-103744-api-server

## 2026-02-28 — Persistence: SQLite via better-sqlite3

**Decision**: Use SQLite with synchronous better-sqlite3 over Postgres.
**Rationale**: Zero infrastructure, single-file DB, WAL mode for concurrency. MVP doesn't need multi-process writes. JSON blob column provides schema flexibility.
**Run**: 20260228-103744-api-server

## 2026-02-28 — Server types: duplicate over share

**Decision**: Copy types from frontend to `server/src/types.ts` rather than creating a shared package.
**Rationale**: Shared package adds build complexity. Server needs different `RequestStatus` (8 states vs 2). Manual sync is acceptable for MVP.
**Run**: 20260228-103744-api-server
