# T7: Checker Fixes — Implementer Report

## Issues addressed

1. **C8: Connect AppContext to API** — AppContext now imports `api.ts`, detects mock mode via `isMockMode = !import.meta.env.VITE_API_BASE`, and branches in `submitDraft`, `retryRequest`, and `redraft`. API mode uses `createRequest()` + `subscribeToEvents()` + `fetchRequest()` for SSE hydration. Mock mode preserves exact existing behavior.

2. **C9: Initial load spinner** — Added `isLoading` state. In API mode, `fetchRequests()` is called on mount with a spinner in the left rail. In mock mode, `isLoading` starts as `false` (no spinner needed since localStorage is sync).

3. **isSubmitting race** — Replaced single `isSubmitting: boolean` with `inFlightCount: number`. Each submission increments, each completion decrements. `isSubmitting = inFlightCount > 0`. Concurrent submissions no longer interfere.

## Additional changes

- Added `subscribeAndHydrate(id)` helper for SSE subscription with auto-cleanup
- Added `sseCleanupRef` to track active SSE connections for cleanup on unmount
- Extracted `loadFromStorage()` helper from inline useState initializer
- Added `useCallback` import for memoizing `scheduleProgress` and `subscribeAndHydrate`

## Verification

- `npm run lint` passes
- `npm run build` succeeds
