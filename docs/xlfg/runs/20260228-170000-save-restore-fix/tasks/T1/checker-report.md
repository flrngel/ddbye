# Checker report

## Verdict
- ACCEPT

## Findings

### Blockers
- None.

### Important
- **`inFlightCount` double-decrement is theoretically possible in the SSE reconnect path.**
  In `subscribeAndHydrate` (line 168-188), when `request.ready` / `request.failed` fires, the code calls `sseCleanupRef.current.get(id)?.()` (line 176) which closes the EventSource. However the cleanup is called _after_ `api.fetchRequest(id)` is already in-flight; if the EventSource is somehow still open and fires a second terminal event before the first `fetchRequest` resolves, `setInFlightCount((c) => c - 1)` could fire twice for the same subscription, driving `inFlightCount` negative and leaving `isSubmitting` stuck false while the UI may show stale spinner state. In practice this is extremely unlikely because SSE terminal events are sent once and the `source.close()` call immediately removes the listener, but the ordering of cleanup (line 176-177) happens synchronously _before_ the async `fetchRequest` resolves, so this is safe as written. No fix needed, but documented for awareness.

- **Reconnected running requests start with stale local run stage data.**
  When the API mode `useEffect` re-subscribes to in-progress requests (lines 201-205), intermediate SSE events (non-terminal) trigger `advanceRun(r.run)` locally (line 183). But the stored `r.run` reflects the state at page-load time, not the real server-side stage. This means the progress bar can skip or appear to go backwards when the next intermediate event arrives. This was present before this change and is not introduced here; it is acceptable for a prototype.

### Nice-to-have
- The `cancelled` guard (line 197) correctly protects against React 18 strict-mode double-invocation for `setRequests` and `setSelectedId`, but `subscribeAndHydrate` (lines 202-205) runs inside the `.then()` block which is _also_ guarded by `if (cancelled) return`. So if the cleanup runs before the fetch resolves, no SSE subscriptions are created. This is correct.
- The `isMockMode` constant is now module-level (line 61, before `loadFromStorage` at line 63) and before the `useEffect` at line 192 that references it. Declaration order is correct throughout.

## Required fixes before accept
- None.

## Verification notes

### Checklist

1. **Mock mode stale-running fix (spec AC 1)**
   - `isMockMode` declared at line 61 (module level, before `loadFromStorage` at line 63). Order is correct.
   - `loadFromStorage()` at lines 72-78: when `isMockMode` is true, any persisted `running` request is mapped to `status: 'failed'` with `errorMessage: 'Run interrupted — page was refreshed. Click retry to re-run.'`.
   - `status: 'failed' as const` satisfies the `RequestStatus` union (`'running' | 'ready' | 'failed'` in `src/types.ts` line 11).
   - `errorMessage?: string` exists on `DiligenceRequest` at `src/types.ts` line 85.
   - AC 1: PASS.

2. **`isMockMode` declared before `loadFromStorage` uses it**
   - `isMockMode` is at line 61, `loadFromStorage` is at line 63. PASS.

3. **API mode SSE reconnect (spec AC 2)**
   - The `useEffect` at line 192 now filters `data` for `r.status === 'running'` (line 201) and calls `subscribeAndHydrate(r.id)` (line 204) for each, with a paired `setInFlightCount((c) => c + 1)` (line 203) so the UI reflects in-progress work.
   - `subscribeAndHydrate` correctly decrements `inFlightCount` on terminal events (lines 172, 174).
   - AC 2: PASS.

4. **`subscribeAndHydrate` declared before the `useEffect` that references it**
   - `subscribeAndHydrate` is defined at line 167 (via `useCallback`). The `useEffect` is at line 192. The `useEffect` depends on `subscribeAndHydrate` in its dependency array (line 219). Order is correct. PASS.

5. **`tsc --noEmit` passes**
   - Confirmed: `npm run lint` exits 0 with no output. PASS.

6. **No regressions to existing save/delete/retry flows**
   - `deleteRequest` (line 249): clears timers and SSE cleanups before removing from state. Unchanged.
   - `retryRequest` (line 264): mock path creates a new simulated request and schedules progress; API path creates a new request and calls `subscribeAndHydrate`. Unchanged.
   - `submitDraft` (line 221): mock path unchanged; API path unchanged.
   - `redraft` (line 294): unchanged.
   - The storage `useEffect` (line 95-97) persists `requests` on every change; this is unchanged and still fires after the stale-to-failed remap on load, so the corrected state will be persisted immediately. No orphaned "running" entries survive a subsequent refresh.
   - The global cleanup `useEffect` (lines 107-114) still clears all timers and SSE connections on unmount. PASS.

### Scope compliance
- Only `src/store/AppContext.tsx` was modified. Diff confirms this. PASS.

### Build verification
- `tsc --noEmit` passes (verified by running `npm run lint`). `vite build` is reported passing by the implementer (322 KB bundle).
