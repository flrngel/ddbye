# Checker report

## Verdict
- ACCEPT

## Per-issue verdicts

### C8 — Connect AppContext to API: ACCEPT
AppContext properly imports `* as api from '@/lib/api'` and `MockModeError` (line 4–5). The `isMockMode` constant is derived at module load time from `import.meta.env.VITE_API_BASE` (line 84). All three mutating operations (`submitDraft`, `retryRequest`, `redraft`) branch on `isMockMode` with clear fork logic. The API path uses `createRequest` + `subscribeAndHydrate` (which internally calls `subscribeToEvents` + `fetchRequest`). The mock path preserves exactly the original `createSimulatedRequest` + `scheduleProgress` behavior. The `loadExample` functions are draft-only and correctly untouched in both modes.

### C9 — Initial-load spinner: ACCEPT
`isLoading` initialises to `!isMockMode` (line 91) — `true` in API mode, `false` in mock mode, with no flash. The mount `useEffect` (lines 97–121) sets it `true` before the fetch, then sets it `false` in `.finally()`. A cancellation flag (`cancelled`) prevents state updates after unmount. The left rail renders `<Loader2 className="h-5 w-5 animate-spin" />` in a centred container when `isLoading === true` (Console.tsx lines 177–180). The empty-state card and request list are gated behind `isLoading` so they don't flash while the fetch is in flight.

### isSubmitting race — ACCEPT
The single `isSubmitting: boolean` has been replaced by `inFlightCount: number` (line 90), with `isSubmitting = inFlightCount > 0` (line 92). Each submission path increments on start and decrements on terminal event:
- `scheduleProgress`: increments at entry, decrements on the last timeout callback (lines 156, 174).
- `submitDraft` (API): increments before `createRequest`, decrements in `subscribeAndHydrate` on `request.ready`/`request.failed`, or immediately in `.catch()` if `createRequest` rejects (lines 212, 186–188, 228).
- `retryRequest` and `redraft` follow the same pattern.

Concurrent submissions each hold their own count slot and do not interfere with each other.

## Findings

### Blockers
None.

### Important

1. **SSE cleanup called before `fetchRequest` resolves (lines 190–191).**
   In `subscribeAndHydrate`, on a terminal SSE event the cleanup is called synchronously (`sseCleanupRef.current.get(id)?.()`) before the `fetchRequest` promise resolves. This means the `EventSource` is closed while a subsequent hydration fetch is still in flight. The hydration fetch itself is HTTP (not SSE), so closing the `EventSource` here is safe and correct — this is not a bug, but worth noting for future maintainers.

2. **`inFlightCount` is not decremented if the SSE connection never emits a terminal event (e.g., server drops without `request.failed`).**
   The spec acknowledges this: "Re-connection logic is out of scope; the request stays in 'running' state until the user refreshes." As a result `isSubmitting` stays `true` indefinitely for that in-flight slot after a dropped SSE connection. The submit button remains disabled. This is an accepted edge case per the spec's out-of-scope statement, but is worth a follow-up task.

3. **`redraft` mock path calls `scheduleProgress(id)` without updating `input.tone`/`input.preferredChannel` on the stored request (line 284).**
   The generated object (`createSimulatedRequest(updatedInput)`) has the new tone/channel, but the spread `{ ...generated, id, createdAt: r.createdAt }` does correctly propagate the new `input` from `generated`. This is fine — verifying it is not a regression.

### Nice-to-have

1. `subscribeAndHydrate` has no timeout or safeguard against a server that emits neither `request.ready` nor `request.failed` for a long period. A future iteration could add a per-request timeout that transitions the request to `failed` on the client side and decrements `inFlightCount`.

2. `Loader2` from lucide-react is used instead of the pure Tailwind CSS spinner described in the UX notes (`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin`). The spec says "no new component library", but `lucide-react` is already a declared dependency so `Loader2` is acceptable. Not a blocker.

## Required fixes before accept
None.

## Verification notes

- `npm run lint` (tsc --noEmit): passes with zero errors.
- `npm run build`: succeeds, output 321 kB JS, no warnings.
- `isLoading` initialises to `false` in mock mode — no spinner flash on demo load.
- `isLoading` initialises to `true` in API mode — spinner shows immediately without waiting for the `useEffect` to run.
- `inFlightCount` is a `useState` (not a ref), so React re-renders correctly on each increment/decrement.
- SSE cleanup on unmount is handled by iterating `sseCleanupRef.current.forEach((cleanup) => cleanup())` in the component-level cleanup `useEffect` (lines 127–132).
- File scope: only `src/store/AppContext.tsx`, `src/lib/api.ts`, and `src/pages/Console.tsx` were modified. No root configs, server, worker, or test files touched.
