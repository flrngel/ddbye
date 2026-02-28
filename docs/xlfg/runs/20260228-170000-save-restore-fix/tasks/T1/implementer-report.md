# T1 Implementer Report

## Changes

File: `src/store/AppContext.tsx`

### Bug 1: Stale "running" requests in mock mode
- Moved `isMockMode` declaration above `loadFromStorage()`
- Added logic in `loadFromStorage()`: when in mock mode, any persisted `running` requests are marked `failed` with message "Run interrupted — page was refreshed. Click retry to re-run."
- This prevents forever-stuck requests after page refresh

### Bug 2: API mode SSE reconnect
- Moved the API fetch `useEffect` to after `subscribeAndHydrate` declaration (was using it before declaration)
- After fetching requests from API, filters for `running` ones and calls `subscribeAndHydrate()` for each
- Increments `inFlightCount` so the UI shows submitting state

### Bug 3: (Not fixed — documented as acceptable)
- Deleting all requests then refreshing brings back seeded cases
- This is actually desirable for a demo — users can always get back to the examples

## Verification
- `tsc --noEmit` passes
- `vite build` passes (322 KB JS bundle)
