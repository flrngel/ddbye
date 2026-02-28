# Architecture review

## Summary

The frontend polish run (C1–C9) is a well-scoped set of additions to a single-page React prototype. The type layer is clean, the API client module is correctly isolated, and most UI concerns are addressed. However several architectural issues were introduced that go beyond spec compliance and will compound as the codebase grows: `AppContext` has become a mixed-concern god-object, the `isSubmitting` counter pattern has a concurrency defect that is an architectural problem not just a bug, API-mode detection is baked in as a module-level side-effect constant, and `Console.tsx` is approaching a size where it will be painful to maintain. None of these are catastrophic for a prototype, but two of them (the counter and the module-level constant) will cause observable runtime defects under production use.

---

## Already covered by verification

The checker report (`tasks/checker-report-combined.md`) thoroughly covers spec compliance across C1–C9. The following findings from that report are already documented and do not need to be repeated here:

- C8 not implemented (AppContext never calls api.ts) — checker finding #1
- C9 initial-load spinner absent — checker finding #2
- `isSubmitting` boolean race across concurrent submissions — checker finding #3
- `retryRequest` does not set `isSubmitting` — checker finding #4
- `deleteRequest` calls `setSelectedId` inside `setRequests` updater — checker finding #5
- Redraft has no explicit `isRedrafting` guard — checker finding #6
- Research board SectionCard action badge ignores `failed` status — checker finding #7
- `subscribeToEvents` throws synchronously — checker finding #8
- Unused `Input` import in `Console.tsx` — checker finding #9

---

## Net-new findings

### P0 (blockers)

**P0-A: `isMockMode` is a module-level constant evaluated at import time, making API-mode toggling impossible at runtime and breaking test isolation.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, line 84.

```typescript
const isMockMode = !import.meta.env.VITE_API_BASE;
```

`import.meta.env` values are inlined by Vite at build time. A single production bundle either always has `VITE_API_BASE` or never has it — the constant is effectively frozen per build. This is the correct pattern for environment configuration in Vite, but it creates two problems:

1. The `isMockMode` name implies a runtime switch. Because `AppContext` branches on `isMockMode` throughout `submitDraft`, `retryRequest`, and `redraft`, any future code that tries to mock or override this flag in a test environment (e.g., a vitest setup that sets `import.meta.env.VITE_API_BASE`) will be ineffective because the constant was captured at module load. A test that imports `AppContext` before setting the env var will evaluate `isMockMode = true` permanently for that module.

2. More critically for the current spec: the C8 detection strategy in spec section C8 says "AppContext detects mock mode by attempting `fetchRequests()` and catching `MockModeError`". The implementation instead does a direct env-var check, which is more fragile — if `VITE_API_BASE` is set to a nonempty value but the server is unreachable, `isMockMode` is `false` and the app will attempt API calls rather than gracefully surfacing the network error. The spec's edge-case table explicitly calls this out: "Do not silently fall back to mock mode on network failure — only fall back on `MockModeError`." The current code does not fall back at all; it goes into an error state with no user-visible message. This is the architectural root of the C8 gap.

The fix is to keep the env-var check but treat `isMockMode` as a derived function or make the branch explicit at each call site using a `try/catch MockModeError` guard as the spec describes, rather than a constant.

---

**P0-B: `scheduleProgress` uses an append-only `timeoutsRef` array that is never compacted, and the cleanup effect that calls `clearTimeout` on it is registered with an empty dependency array but only runs on unmount — meaning long-lived sessions accumulate stale timeout IDs indefinitely.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, lines 93, 155–179, 127–131.

```typescript
const timeoutsRef = useRef<number[]>([]);
// ...
timeoutsRef.current.push(timeoutId);   // grows without bound
// ...
useEffect(() => {
  return () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    // ...
  };
}, []); // only on unmount
```

Each call to `scheduleProgress` appends 4 timeout IDs. After those timeouts fire, the IDs remain in the array. After 100 requests submitted in a session, the array holds 400 dead IDs. On unmount, `clearTimeout` is called on all 400 — the dead ones are no-ops, so no functional harm occurs, but the array is an unbounded memory allocation with no shrink path. More importantly, there is no call to `clearTimeout` when a specific request is deleted or retried: if a request is deleted while its `scheduleProgress` timers are still pending, those timers will still fire and call `setRequests`, attempting to update a request that no longer exists. The updater function guards `if (request.id !== id) return request`, so the request will not be found and the array will be returned unchanged — but the state update still fires and triggers a re-render for no reason. Under the redraft flow this is worse: `redraft` in mock mode calls `scheduleProgress(id)` on the existing ID and also replaces the request via `createSimulatedRequest`, so now two sets of timers target the same ID and both will mutate it.

The fix is to track in-flight timeout sets per request ID (e.g., `Map<string, number[]>`) and cancel the previous set for an ID before scheduling a new one.

---

### P1 (important)

**P1-A: `AppContext` is a mixed-concern god-object that owns business logic, persistence, simulation orchestration, API integration, and derived UI state — all in one 356-line file with no internal separation.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`

After the polish run `AppContext` is responsible for:
- Draft form state (`draft`, `setDraft`, `updateDraftField`, `toggleFocus`)
- Request list state and persistence (`requests`, localStorage sync)
- Selection state (`selectedId`, `selectedRequest`)
- Mock simulation orchestration (`scheduleProgress`, timeout management)
- API integration (`subscribeAndHydrate`, SSE cleanup map)
- Business operations (`submitDraft`, `deleteRequest`, `retryRequest`, `redraft`)
- UI loading flags (`isSubmitting`, `isLoading`, `inFlightCount`)
- Static option arrays exported as module-level constants (`channelOptions`, `toneOptions`, etc.)

These static option arrays (`channelOptions`, `toneOptions`, `goalOptions`, `focusOptions`) at lines 329–355 have no dependency on any context state and should be defined in `src/types.ts` or a dedicated `src/constants.ts`. Their presence in `AppContext.tsx` means any module that only needs, say, `channelOptions` for a UI selector must import from `AppContext`, pulling in all of the context machinery.

The `scheduleProgress` and `subscribeAndHydrate` functions belong in the simulation/transport layer (`src/logic/mockAgent.ts` and `src/lib/api.ts` respectively) as callbacks, not as methods on the context provider. Separating them would make both the provider and the simulation layer independently testable.

This is a P1 rather than P0 because the code works correctly today and the surface is small enough to hold in one head. It becomes a P0 the moment a second engineer works in this file.

---

**P1-B: `selectedRequest` derivation falls back to `requests[0]` silently when `selectedId` does not match any request.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, lines 134–137.

```typescript
const selectedRequest = useMemo(
  () => requests.find((request) => request.id === selectedId) ?? requests[0],
  [requests, selectedId],
);
```

When `selectedId === ''` (the empty state after deletion), this expression evaluates `requests.find(...)` which returns `undefined`, then falls back to `requests[0]`. If `requests` is non-empty but `selectedId` is `''`, the user sees the first request in the workspace even though they explicitly deselected everything. This produces a UI state that is inconsistent with what the user did.

Downstream in `Console.tsx`, the Research board and Outreach studio both use `selectedRequest ? ... : <empty state>` as the branch condition. If `selectedRequest` is always non-undefined when requests exist (due to the fallback), the empty states for the workspace panels will never render while there are any requests — only the left rail empty state will show. The spec requires the workspace to show empty guidance when "no request is selected", which is the state the user is in immediately after deleting the only request and before localStorage is re-read. The `requests[0]` fallback masks this.

The fix is to make `selectedRequest` return `undefined` when `selectedId === ''` rather than falling back. The `?? requests[0]` fallback was likely added for first-load convenience (auto-select the first seeded case) but it conflates two different scenarios.

---

**P1-C: `api.ts` does not handle HTTP 4xx responses with structured error bodies — all non-2xx responses are thrown as generic `Error` strings with only the status code.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 26–27, 33–34, 40–41, 72–73.

```typescript
if (!res.ok) throw new Error(`createRequest failed: ${res.status}`);
```

Every failing HTTP call discards the response body. If the real backend returns a JSON error body (e.g., `{ "error": "rate_limit_exceeded", "retryAfter": 60 }`), the client throws a message containing only `"createRequest failed: 429"`. The caller in `AppContext.tsx` has no way to distinguish a rate limit from a validation error from a server crash. When `AppContext` catches this in the `.catch()` handlers (lines 227–229, 270–271, 292–294), it silently decrements `inFlightCount` with no user-visible error message.

The result is that API-mode errors are invisible: the spinner disappears, the request list does not update, and the user has no feedback. The spec says "surface this as a top-level error state (toast or inline message)" for network failures. There is no mechanism to do this today because the error object carries no structured information and there is no error-surfacing path from `AppContext` to the UI.

The minimum fix is to have `api.ts` attempt to parse the error response body and attach it to the thrown error, and to expose a separate error state from `AppContext` for these cases.

---

**P1-D: `subscribeToEvents` in `api.ts` has no `onerror` handler on the `EventSource`, so SSE connection errors are silently dropped.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 44–59.

```typescript
const source = new EventSource(`${base}/requests/${encodeURIComponent(id)}/events`);
source.onmessage = (e) => { ... };
return () => source.close();
```

`EventSource` fires `onerror` when the connection fails or is closed by the server. Without an `onerror` handler, the caller (`subscribeAndHydrate` in `AppContext`) never learns that the SSE stream died. The in-flight counter (`inFlightCount`) is never decremented, the spinner never disappears, and `isSubmitting` stays true forever. The spec acknowledges "Re-connection logic is out of scope" but does not exempt error handling: "the request stays in 'running' state until the user refreshes" is an acceptable end state, but only if the `inFlightCount` is properly decremented so the UI does not hang in a perpetual loading state.

The fix: add `source.onerror = () => { onEvent({ type: 'request.error', payload: null }); }` or call a separate `onError` callback to allow the caller to decrement the counter and update request status.

---

### P2 (nice to have)

**P2-A: `Console.tsx` is 718 lines long and mixes layout, stateful sub-widgets, and render logic into a single flat component.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx`

The file contains three implicit sections that would benefit from extraction:
- The intake form (lines 230–390) — self-contained with its own field layout
- The Research board (lines 392–533) — reads `selectedRequest.research` only
- The Outreach studio (lines 535–675) — reads `selectedRequest.outreach` and manages `showRedraft`, `redraftTone`, `redraftChannel` local state

The `showRedraft`, `redraftTone`, and `redraftChannel` local state (lines 129–131) is co-located in `ConsolePage` even though it belongs semantically to the Outreach studio section. If the studio were extracted to its own component (`<OutreachStudio request={selectedRequest} />`), this state could live there. Currently `ConsolePage` owns state that is only read and mutated within 80 lines at the bottom of the file.

The `renderDeliverable` function (lines 79–124) is a free function rather than a component. It creates JSX and is called as a function (`renderDeliverable(outputChannel, deliverable)`) rather than rendered as `<Deliverable .../>`. This bypasses React's reconciliation for the sub-tree and prevents React DevTools from showing it as a named component. Converting it to a proper component would improve debuggability.

**P2-B: `createPGDraft` and `createA16zDraft` are factory functions inside `AppContext.tsx` that duplicate data already present in `seededCases` in `sampleCases.ts`.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, lines 40–68.

The two example drafts are separate hand-written structs that must be kept in sync with the seeded cases' `input` fields. If `seededCases[0].input` is updated in `sampleCases.ts`, the PG draft factory in `AppContext.tsx` will silently diverge. The simpler approach is `loadExample('pg')` setting `draft` to `{ ...seededCases[0].input }` directly, eliminating the separate factory functions.

**P2-C: `MockModeError` is defined in `api.ts` but caught by name in `AppContext.tsx` — this is the only inter-module error class coupling in the codebase.**

Files: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts` line 5; `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx` line 5 and 109.

This is intentional per the spec and not wrong. The observation is that `MockModeError` is effectively a sentinel value used for control flow, not a true error condition. A cleaner alternative for a future refactor would be an explicit `isMockMode()` utility function exported from `api.ts` so callers do not need to try/catch to determine mode. The error class approach is adequate for now but increases the cognitive load for any developer unfamiliar with the pattern.

**P2-D: `vite-env.d.ts` does not declare `VITE_API_BASE` as a typed env variable.**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />
```

Vite's `ImportMetaEnv` interface can be extended to add typed declarations for project-specific env variables:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}
```

Without this declaration, `import.meta.env.VITE_API_BASE` has type `string` (from the default Vite definition, which types all `VITE_*` vars as `string`). In `api.ts` line 3 it is cast `as string | undefined`, which is a manual workaround. The explicit declaration in `vite-env.d.ts` makes the `| undefined` part of the type system rather than a cast assumption and removes the need for the cast.

---

## Why verification did not catch net-new findings

The checker report performed precise spec-compliance verification against C1–C9 acceptance criteria. It correctly identified every missing and partially-implemented criteria item. The architectural findings above were not caught for the following reasons:

- **P0-A (`isMockMode` constant):** The checker report identified C8 as not implemented but attributed it to the API client not being called. The underlying architectural issue — that freezing mode detection as a compile-time constant conflicts with the spec's runtime `MockModeError` detection strategy and breaks test isolation — was not in scope for a spec-compliance check.

- **P0-B (unbounded `timeoutsRef`, stale timer fire after delete/redraft):** The checker verified that `deleteRequest` removes from state and that `scheduleProgress` fires correctly in the normal path. The interaction between `deleteRequest` and pending timers for the same request ID, and the double-timer problem introduced by `redraft` calling `scheduleProgress` on an existing ID, are cross-feature interaction patterns that a per-task checker would not naturally encounter.

- **P1-A (god-object AppContext):** Spec compliance checking does not evaluate separation of concerns; it verifies that required behaviors exist. The co-location of static option arrays with context provider logic and the missing boundary between simulation and transport are architectural shape concerns.

- **P1-B (`selectedRequest` fallback to `requests[0]`):** The checker verified that empty states render correctly in the described scenarios. The subtle semantic divergence — that the `?? requests[0]` fallback makes "no selection" indistinguishable from "first request selected" — would require a behavioral test that explicitly sets `selectedId = ''` while `requests` is non-empty, which was not part of the verification suite.

- **P1-C (unstructured error bodies in api.ts):** The checker verified that `api.ts` exports the correct function signatures and that `MockModeError` is the sentinel. It did not test HTTP error response handling because no backend exists in this track.

- **P1-D (no SSE `onerror` handler):** The checker noted that `subscribeToEvents` returns a cleanup function and uses `EventSource` correctly per spec. The missing `onerror` handler is an omission in the network resilience layer, not in the function signature or SSE mechanics, and was outside the checker's spec-compliance scope.

---

## Suggested refactors

Listed in priority order.

**1. Fix the `timeoutsRef` / stale-timer problem (P0-B) before the redraft feature ships.**

Replace the single `timeoutsRef` array with a `Map<string, number[]>`:

```typescript
const timeoutsRef = useRef<Map<string, number[]>>(new Map());

const cancelProgress = (id: string) => {
  timeoutsRef.current.get(id)?.forEach(window.clearTimeout);
  timeoutsRef.current.delete(id);
};

const scheduleProgress = useCallback((id: string) => {
  cancelProgress(id); // cancel any stale timers for this ID
  const ids: number[] = [];
  steps.forEach((delay, index) => {
    ids.push(window.setTimeout(...));
  });
  timeoutsRef.current.set(id, ids);
}, []);
```

Call `cancelProgress(id)` at the start of `deleteRequest` and at the start of the mock-mode branch in `redraft`.

**2. Replace the `?? requests[0]` fallback in `selectedRequest` with a deliberate auto-select on first load only (P1-B).**

```typescript
// On first load, auto-select the first request explicitly
useEffect(() => {
  if (!selectedId && requests.length > 0) {
    setSelectedId(requests[0].id);
  }
}, []); // intentionally runs once

const selectedRequest = useMemo(
  () => requests.find((r) => r.id === selectedId),
  [requests, selectedId],
);
```

This makes "no selection" a real, representable state and keeps the auto-select behavior visible as an explicit side-effect.

**3. Extract static option arrays to a dedicated constants module (P1-A partial).**

Move `channelOptions`, `toneOptions`, `goalOptions`, and `focusOptions` from `AppContext.tsx` lines 329–355 to a new file `src/constants.ts`. Update `Console.tsx` imports accordingly. This decouples UI code that needs only the option list from the context machinery.

**4. Add `onerror` handler to `subscribeToEvents` (P1-D).**

```typescript
source.onerror = () => {
  try {
    onEvent({ type: 'sse.error', payload: null });
  } catch {
    // swallow
  }
  source.close();
};
```

In `subscribeAndHydrate`, handle the `'sse.error'` event type by decrementing `inFlightCount` and setting the request status to `'failed'` so the user sees an actionable error rather than a frozen spinner.

**5. Extend `vite-env.d.ts` to type `VITE_API_BASE` (P2-D) — one line, no risk.**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}
```

**6. Convert `renderDeliverable` to a named React component (P2-A).**

```typescript
function DeliverableView({ channel, deliverable }: { channel: Channel; deliverable: Deliverable }) { ... }
// Called as: <DeliverableView channel={outputChannel} deliverable={deliverable} />
```

**7. Derive example drafts from seeded cases to eliminate duplication (P2-B).**

```typescript
const loadExample = (key: 'pg' | 'a16z') => {
  const seed = key === 'pg' ? seededCases[0] : seededCases[1];
  setDraft({ ...seed.input });
};
```

Remove `createPGDraft` and `createA16zDraft` from `AppContext.tsx`.
