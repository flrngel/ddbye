# Patterns

Reusable patterns discovered during development.

## Playwright port override (Track D)

Use `E2E_PORT` env var in `playwright.config.ts` to avoid conflicts when port 3000 is occupied locally. Default to 3000 for CI.

## Lint-report pattern (Track D)

When a linter setup can't fix existing violations (ownership constraints), document them in `tests/lint-report.md` and use `continue-on-error: true` in CI.

## Hono API server template (run: 20260228-103744-api-server)

- **Stack**: Hono + @hono/node-server + better-sqlite3 + tsx
- **SSE fan-out**: `Map<string, Set<SSEWriter>>` in a dedicated `sse.ts` module. `addListener` returns cleanup function. `emit` broadcasts to all registered writers.
- **Stub dispatch**: Timer-based `setTimeout` chains in `worker.ts` with `// TODO Track B` markers. Each stage transition persists to DB then emits SSE.
- **DB pattern**: Prepared statements, WAL mode, synchronous API. Single JSON blob column for flexibility.
- **CORS guard**: Default `*` only when `NODE_ENV` is unset or `development`. Throw in non-dev without `CORS_ORIGIN`.
