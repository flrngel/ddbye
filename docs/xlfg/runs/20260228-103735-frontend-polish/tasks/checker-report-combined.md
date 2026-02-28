# Checker Report — Frontend Polish (Track C, All Tasks T1–T6)

**Run dir:** `docs/xlfg/runs/20260228-103735-frontend-polish/`
**Spec:** `spec.md` acceptance criteria C1–C9
**Lint result:** `npm run lint` (tsc --noEmit) — PASS (zero errors)
**Build result:** `npm run build` — PASS (clean production bundle)

---

## Overall Verdict

**REVISE**

The implementation covers the great majority of the spec and compiles cleanly. However there are three blocking issues that prevent ACCEPT: two spec criteria are not implemented (C8 API integration and C9 loading spinners beyond the submit button), one edge-case from the spec table is handled incorrectly (`isSubmitting` races across concurrent submissions), and two secondary concerns are important enough to document explicitly.

---

## Per-Task Verdicts

### T1 — HTML title, `RequestStatus`, `errorMessage?`, Badge `failed` variant

**Verdict: ACCEPT**

All three spec criteria satisfied:

- `index.html` line 6: `<title>Outreach OS</title>` — matches C1 exactly.
- `src/types.ts` line 11: `export type RequestStatus = 'running' | 'ready' | 'failed';` — matches C3 and the type-change block in spec.
- `src/types.ts` line 85: `errorMessage?: string` added to `DiligenceRequest` — matches the Open question 1 assumption in spec.
- `src/components/ui/Badge.tsx` line 15: `failed: 'border-red-200 bg-red-50 text-red-700'` — matches the exact token string in C3 and the type-changes block.

No findings.

---

### T2 — Empty states

**Verdict: ACCEPT**

All C2 acceptance criteria satisfied:

- Left rail empty state (`Console.tsx` lines 177–180): text is exactly "No requests yet. Write a brief and run your first due diligence." — matches C2.
- Research board empty state (`Console.tsx` lines 524–526): text is "Submit a brief above to start your first due diligence run." — matches C2.
- Outreach studio empty state (`Console.tsx` lines 667–669): text is "Outreach copy will appear here once the research is done." — matches C2.
- Requests-count badge (`Console.tsx` line 173): `<Badge variant="blue">{requests.length}</Badge>` — renders "0" when empty, never hidden — matches C2.
- All three empty states use `border-dashed border-neutral-300 bg-neutral-50/70` — consistent with the UX notes in spec.

No findings.

---

### T3 — Failed state UI and retry

**Verdict: ACCEPT**

C3 acceptance criteria satisfied:

- Error card (`Console.tsx` lines 397–409): renders when `selectedRequest.status === 'failed'` with `AlertTriangle` icon, `border-red-200 bg-red-50` container, message text falling back to spec-required copy ("The run failed. You can retry with the same brief.") when `errorMessage` is absent, and Retry button that calls `retryRequest(selectedRequest.id)`.
- `retryRequest` (`AppContext.tsx` lines 162–169): creates a new simulation from the same `input`, removes old failed request from list, selects new request, and calls `scheduleProgress` — matching spec assumption in Open question 2 (new ID).
- Left rail badge (`Console.tsx` line 198–201): uses `failed` variant when `request.status === 'failed'` — matches C3.

**Nice-to-have:** `retryRequest` does not set `isSubmitting = true` before calling `scheduleProgress`. This means the submit button does not disable during a retry run. This is below blocker threshold since the spec only mandates `isSubmitting` for the submit-draft path (C9), but it is worth noting for consistency.

---

### T4 — Detailed run states, delete request

**Verdict: ACCEPT**

C4 and C5 acceptance criteria satisfied:

- Left rail badge text (`Console.tsx` lines 199–201): when `status === 'running'`, renders `request.run.find((s) => s.status === 'running')?.label ?? 'queued'`. This shows the stage `label` field (e.g., "Parsing brief") per C4. The spec UX note says show `label` not `key` — this is correct. The fallback to `'queued'` matches the spec Open question 4 assumption.
- `deleteRequest` (`AppContext.tsx` lines 150–160): removes from array, advances selection to `current[idx + 1] ?? current[idx - 1]`, sets `selectedId` to `''` when none remain — matches C5. Writes updated array to localStorage via the `useEffect` at line 86–88.
- Delete button (`Console.tsx` lines 210–216): `e.stopPropagation()` present, `Trash2` at `h-4 w-4`, `opacity-0 group-hover:opacity-100` pattern, wrapped in `div.group.relative` — matches C5 exactly.

**Important — `deleteRequest` state race:** The `setSelectedId` call inside `setRequests` callback (`AppContext.tsx` line 153–156) is technically a side-effect inside a `setRequests` updater. React does guarantee updater functions run synchronously in the same flush in most cases, but calling `setSelectedId` (a separate state setter) from within another state setter's updater is a subtle anti-pattern. It works in practice with React 19's automatic batching but could produce a stale read of `selectedId` in the closure if the component re-renders between calls. The spec acceptance criteria are met; this is flagged as an important note rather than a blocker.

---

### T5 — Redraft flow

**Verdict: ACCEPT with important note**

C6 acceptance criteria checked:

- Redraft button (`Console.tsx` lines 585–599): appears when `selectedRequest?.status === 'ready' && !showRedraft` — correct placement and condition.
- Inline form (`Console.tsx` lines 601–662): no modal, no route change. Tone selector and Channel selector present using same `toneOptions`/`channelOptions` arrays as the intake form. "Generate" button and "Cancel" link present.
- Pre-population (`Console.tsx` lines 592–593): `setRedraftTone(selectedRequest.input.tone)` and `setRedraftChannel(selectedRequest.input.preferredChannel)` called on Redraft button click — matches C6.
- `redraft` in `AppContext.tsx` (`lines 171–180`): updates `input.tone` and `input.preferredChannel`, calls `createSimulatedRequest`, replaces the entry while preserving original `id` and `createdAt`, calls `scheduleProgress(id)` — matches mock-mode behavior in C6 and Open question 3 (replaces entire OutreachPacket).
- Cancel closes form with no state change (`Console.tsx` line 655–659) — correct.

**Important — "Generate" button not disabled during in-flight redraft:** The spec edge-case table states: "Redraft is triggered while another redraft is already running — the Generate button is disabled during the in-flight redraft." There is no `isRedrafting` state variable or similar guard in either `Console.tsx` or `AppContext.tsx`. If the user clicks Generate, the inline form is immediately closed (`setShowRedraft(false)` at line 650), so a second redraft from the same form is not possible for that request. However, if two different requests are both in `ready` status and the user rapidly opens and submits redraft on each, concurrent `scheduleProgress` timers will both fire against their respective IDs without interference, which is safe. The spec's concern is about the same request — because the form closes on Generate, the guard is effectively enforced by the UI flow, not by an explicit flag. This is technically compliant but the enforcement mechanism is implicit rather than explicit (closing the form vs. disabling the button). Flag as important but not a blocker.

**Important — `redraft` does not set `isSubmitting`:** This is consistent with T3's retry observation. The spec's C9 says the submit button should disable while `isSubmitting` is true. The `redraft` path uses the same `scheduleProgress` machinery but never sets `isSubmitting`, so the main submit button remains enabled during a redraft run. Users can accidentally submit a new request while a redraft is in flight. Not a blocker for the C6 criteria specifically, but a behavioral gap worth addressing.

---

### T6 — API client module and loading states

**Verdict: REVISE**

#### C7 — API client

`src/lib/api.ts` exists and exports all five required functions with correct TypeScript signatures:

- `createRequest(input: RequestInput): Promise<{ id: string; status: string; createdAt: string }>` — line 17. Correct.
- `fetchRequests(): Promise<DiligenceRequest[]>` — line 30. Correct.
- `fetchRequest(id: string): Promise<DiligenceRequest>` — line 37. Correct.
- `subscribeToEvents(id, onEvent): () => void` — line 44. Correct; returns `() => source.close()`.
- `redraftRequest(id, tone, channel): Promise<void>` — line 61. Correct.
- `MockModeError` exported class — line 5. Correct sentinel.
- Reads `import.meta.env.VITE_API_BASE` — line 3. Correct.
- `vite-env.d.ts` — `/// <reference types="vite/client" />` — provides `ImportMeta.env` typing so `import.meta.env.VITE_API_BASE` compiles cleanly.

C7 is fully satisfied.

#### C8 — Connect AppContext to API — BLOCKER

**`AppContext.tsx` does not implement C8 at all.** The implementer report acknowledges: "AppContext currently uses mock mode only; C8 integration (connecting to real API) is structured but not active since the fallback is the default path." The spec acceptance criteria C8 are explicit requirements, not optional:

- C8.1: AppContext detects mock mode by attempting `fetchRequests()` and catching `MockModeError`, then falls back to `seededCases` + `localStorage`. — NOT IMPLEMENTED. The context still reads directly from `localStorage` on line 72–79 with no API call.
- C8.2: In API mode, `submitDraft` calls `createRequest(draft)` then `subscribeToEvents`. — NOT IMPLEMENTED.
- C8.3: In API mode, SSE event `request.ready` causes `fetchRequest(id)` to hydrate full request. — NOT IMPLEMENTED.
- C8.4: In mock mode, existing behavior preserved exactly. — This is implicitly satisfied since mock mode is the only mode.
- C8.5: "Load PG example" and "Load a16z example" continue to work in both modes. — Satisfied in mock mode.
- C8.6: No regressions in mock mode. — Satisfied.

The API module (`src/lib/api.ts`) was created but is entirely disconnected from `AppContext.tsx`. No import of `api.ts` exists in `AppContext.tsx`. This is a blocker for the track's done criteria ("The app still works in mock mode ... `src/lib/api.ts` exists with all 5 functions" — the file exists, but the done criteria for C8 "Connect AppContext to API" is not met).

#### C9 — Loading states — PARTIAL BLOCKER

- Submit button spinner and disabled state (`Console.tsx` lines 373–384): `isSubmitting` flag controls `Loader2` spinner and `disabled` attribute. `isSubmitting` is set to true on `submitDraft` and cleared after the last `scheduleProgress` timeout (5000 ms) — matches C9 mock-mode requirement.
- Left rail initial-load spinner: NOT IMPLEMENTED. C9 requires "a CSS spinner in the left rail while `fetchRequests()` is in flight on initial load." Since C8 is not implemented, there is no `fetchRequests()` call and no loading state for it. This criterion is partly blocked by C8, but even as a standalone UI concern it is absent.
- Research/Outreach board spinner for `fetchRequest(id)` in API mode: NOT IMPLEMENTED. Blocked by C8.
- `isSubmitting` race with concurrent submissions: The spec edge case states "The new request is prepended to the list; the in-progress run continues on the previous request. The submit button is disabled only for the new submission's duration." With the current implementation, `isSubmitting` is a single boolean. If a previous submission is still running (its 5 s timer has not fired) and the user submits a second request, `setIsSubmitting(true)` is called again, and the first submission's timer will call `setIsSubmitting(false)` at its 5 s mark — prematurely clearing the loading state for the second submission. This is a behavioral bug matching the spec's edge case.

---

## Findings Summary

### Blockers

1. **C8 not implemented** (`src/store/AppContext.tsx`): The API client module exists but `AppContext` never calls it. `fetchRequests()`, `createRequest()`, `subscribeToEvents()`, and `redraftRequest()` from `src/lib/api.ts` are not imported or used in `AppContext.tsx`. The spec acceptance criteria C8.1–C8.3 are unmet. Required fix: integrate the API client into `AppContext` with mock-mode fallback as specified.

2. **C9 initial-load spinner absent** (`src/pages/Console.tsx`): No CSS spinner appears in the left rail on initial load. Required fix: add an `isLoadingRequests` state (boolean, default false in mock mode, true while `fetchRequests()` is in flight) and render a spinner in the left rail when it is true. In mock mode this state never goes true, so the spinner never shows — but the code path must exist for API mode.

3. **`isSubmitting` race across concurrent submissions** (`src/store/AppContext.tsx` lines 117–139): The single `isSubmitting` boolean is incorrectly shared across submissions. The last-stage timeout handler always calls `setIsSubmitting(false)`. If submission A's timeout fires while submission B is still running, the submit button prematurely re-enables. Required fix: track per-submission completion or count in-flight submissions (e.g., `submittingCount` integer, decrement on each completion, only disable when count > 0).

### Important

4. **`retryRequest` does not set `isSubmitting`** (`AppContext.tsx` line 162–169): Retry re-runs `scheduleProgress` without disabling the submit button. This is inconsistent with the loading state contract. Recommended fix: call `setIsSubmitting(true)` at the start of `retryRequest` so the submit button disables for the retry duration.

5. **`deleteRequest` calls `setSelectedId` inside `setRequests` updater** (`AppContext.tsx` lines 150–160): Calling a different state setter inside another setter's updater function is an anti-pattern in React. Should be refactored to compute the next `selectedId` first and then call both `setRequests` and `setSelectedId` separately.

6. **Redraft `Generate` button has no explicit `isRedrafting` guard** (`Console.tsx`, `AppContext.tsx`): The spec edge case table requires the Generate button to be disabled while a redraft is in flight. The form closes on submit which implicitly prevents re-submission, but this is not an explicit disabled state as the spec describes. Recommended fix: add an `isRedrafting` boolean to `AppContext` (set true in `redraft`, cleared in the last `scheduleProgress` timeout), expose it, and use it to disable the Generate button.

### Nice-to-have

7. **Research board `action` prop ignores `failed` status** (`Console.tsx` line 393): The badge in the SectionCard action slot uses `selectedRequest.status === 'ready' ? 'ready' : 'running'` — it never applies the `failed` variant here even though the left rail badge does. This means the Research board header still shows "running" in the blue variant when a request has failed. Recommended fix: `selectedRequest.status === 'ready' ? 'ready' : selectedRequest.status === 'failed' ? 'failed' : 'running'`.

8. **`subscribeToEvents` throws `MockModeError` synchronously** (`src/lib/api.ts` lines 44–59): `subscribeToEvents` calls `getBase()` which throws `MockModeError` synchronously. This means callers cannot use a try/catch with `await` — they need to wrap the call itself, not the returned promise, in a try/catch. This is a non-obvious API contract. The function signature correctly returns `() => void`, not `Promise`, but any future caller integrating this into a `useEffect` should be aware. Document this behavior in a JSDoc comment.

9. **No `Input` component usage — `Input` import is unused in Console.tsx** (line 25): `import { Input } from '@/components/ui/Input'` is imported but never used in `Console.tsx`. With TypeScript strict mode and `tsc --noEmit`, this does not produce an error (unused imports are not errors by default in TypeScript), but it is a minor cleanliness issue.

---

## Required Fixes Before Accept

1. **Implement C8 in `AppContext.tsx`:** Import `fetchRequests`, `createRequest`, `subscribeToEvents`, `redraftRequest`, and `MockModeError` from `src/lib/api.ts`. In the initial state loader (or a `useEffect` on mount), call `fetchRequests()` and catch `MockModeError` to fall back to the existing localStorage/seededCases path. In `submitDraft`, branch on whether `VITE_API_BASE` is set: if yes, call `createRequest(draft)` then `subscribeToEvents`; if no (i.e., `MockModeError`), use the existing `createSimulatedRequest` + `scheduleProgress` path.

2. **Add `isLoadingRequests` state and left-rail spinner in `Console.tsx`:** Track when the initial `fetchRequests()` call is in flight. Render a `w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin` element in the left rail during that window. In mock mode this state defaults to false and no spinner appears, satisfying backward compatibility.

3. **Fix `isSubmitting` concurrency bug in `AppContext.tsx`:** Replace the single `isSubmitting: boolean` with a counter (`submittingCount: number`) or a Set of in-flight IDs, so that each concurrent submission tracks its own completion independently.

---

## Verification Notes

- `npm run lint` (tsc --noEmit): **PASS** — zero TypeScript errors.
- `npm run build` (Vite production build): **PASS** — clean bundle, 320 KB JS.
- C1 verified: `index.html` line 6 contains `<title>Outreach OS</title>`.
- C2 verified: all three empty-state text strings match spec exactly (direct read of `Console.tsx` lines 179, 524–526, 667–669).
- C3 verified: error card at `Console.tsx` lines 397–409 has all required elements.
- C4 verified: `request.run.find((s) => s.status === 'running')?.label ?? 'queued'` at `Console.tsx` line 200 uses the `label` field as required.
- C5 verified: `deleteRequest` logic, hover-reveal trash button, `stopPropagation`, and `group.relative` wrapper all present.
- C6 verified (except the explicit isRedrafting guard): inline form, pre-population, tone/channel selectors, Generate + Cancel, mock-mode `redraft` implementation all present.
- C7 fully verified: all 5 function signatures, `MockModeError` class, `VITE_API_BASE` read, `EventSource` usage, and cleanup return all present in `src/lib/api.ts`.
- C8 **NOT** verified: `api.ts` is not imported or called from `AppContext.tsx`.
- C9 partially verified: submit-button spinner is present; initial-load and detail-view spinners are absent.
