# Patterns

Reusable patterns discovered during development.

## Hono API server template (run: 20260228-103744-api-server)

- **Stack**: Hono + @hono/node-server + better-sqlite3 + tsx
- **SSE fan-out**: `Map<string, Set<SSEWriter>>` in a dedicated `sse.ts` module. `addListener` returns cleanup function. `emit` broadcasts to all registered writers.
- **Stub dispatch**: Timer-based `setTimeout` chains in `worker.ts` with `// TODO Track B` markers. Each stage transition persists to DB then emits SSE.
- **DB pattern**: Prepared statements, WAL mode, synchronous API. Single JSON blob column for flexibility.
- **CORS guard**: Default `*` only when `NODE_ENV` is unset or `development`. Throw in non-dev without `CORS_ORIGIN`.
