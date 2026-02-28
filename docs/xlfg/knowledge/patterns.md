# Patterns

## Timer cleanup per entity
Use `Map<string, number[]>` for timeout refs, not append-only arrays. Call `clearTimersForRequest(id)` on delete/redraft.

## API mock mode sentinel
`MockModeError` class in `api.ts` — thrown when `VITE_API_BASE` is unset. Callers catch to fall back to mock behavior.

## SSE → hydrate
`subscribeAndHydrate(id)` pattern: subscribe to SSE, on terminal event fetch full entity, clean up EventSource.
