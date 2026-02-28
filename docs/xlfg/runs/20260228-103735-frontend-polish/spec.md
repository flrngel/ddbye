# Spec: Frontend Polish (Track C)

## Problem

The frontend prototype works end-to-end in mock mode, but it is missing several production-readiness layers: the page title is wrong, empty and failed states are unhandled, the left rail shows a generic "running" label instead of the current stage, users cannot delete or redraft requests, and there is no API connection layer for when a real backend is available.

## Goals

1. Fix cosmetic issues (page title).
2. Make every possible request state visible in the UI (empty, running with stage detail, ready, failed).
3. Give users control over the lifecycle (delete, redraft).
4. Add a typed API client that connects to a real backend when `VITE_API_BASE` is set, and falls back to the existing mock simulation when it is not.
5. Show loading states during async operations.
6. Keep mock mode fully functional — no server required for demo purposes.

## Non-goals

- Adding a real backend (server-side code is out of scope for this track).
- Adding a test runner or E2E framework (testing.md notes only `tsc --noEmit` is configured).
- Changing the routing structure (two routes remain: `/` and `/console`).
- Adding new npm dependencies (native `fetch` and `EventSource` only).
- Touching `server/`, `worker/`, `tests/`, root configs, or `.github/`.
- Implementing the full SSE event model on the server side; only the client-side subscription wrapper is in scope.
- Archive flow (soft-delete only — request is removed from the list with no recovery UI).

## User stories

- As a user opening the app for the first time with no saved requests, I see a helpful prompt in the left rail and an empty workspace instead of a blank area.
- As a user whose request encountered an error, I see an error card with a human-readable message and a retry button that re-runs the same input.
- As a user watching a request run, I see the specific current stage name (e.g. "researching") in the left rail badge instead of just "running".
- As a user who no longer needs a request, I can delete it from the left rail with a hover-revealed trash icon.
- As a user who wants to adjust tone or channel after a request finishes, I can redraft from the outreach studio without re-running the full diligence.
- As a developer connecting a real API backend, I can set `VITE_API_BASE` and the app will use the real endpoints with no code changes.

## Acceptance criteria

### C1 — HTML title
- [ ] `index.html` `<title>` is exactly "Outreach OS".

### C2 — Empty state
- [ ] When `requests` is empty, the left rail shows a card with text: "No requests yet. Write a brief and run your first due diligence."
- [ ] When no request is selected or `requests` is empty, the Research board workspace renders a centered guidance card instead of a blank area. Copy: "Submit a brief above to start your first due diligence run."
- [ ] When no request is selected or `requests` is empty, the Outreach studio renders a centered guidance card instead of a blank area. Copy: "Outreach copy will appear here once the research is done."
- [ ] The `requests.length` badge in the left rail shows "0" when empty and does not hide.

### C3 — Failed state UI
- [ ] `RequestStatus` in `src/types.ts` is updated to `'running' | 'ready' | 'failed'`.
- [ ] The Badge `variant` map in `src/components/ui/Badge.tsx` includes a `failed` variant styled with amber/red tokens (e.g. `border-red-200 bg-red-50 text-red-700`).
- [ ] When `selectedRequest.status === 'failed'`, the Research board renders an error card above the run stages showing: a red/amber header with an error icon, a message "The run failed. You can retry with the same brief.", and a "Retry" button.
- [ ] Clicking Retry calls `retryRequest(id)` on `AppContext`, which re-submits the same `input` (in mock mode this re-runs `createSimulatedRequest` and `scheduleProgress`; in API mode it calls `POST /requests`).
- [ ] Left rail badge for a failed request uses the `failed` variant.

### C4 — Detailed run states
- [ ] The left rail request card shows the label of the currently-running `RunStage` (the first stage with `status === 'running'`) in place of the static word "running". Example: "researching".
- [ ] When all stages are `done` (status is `ready`), the badge shows "ready".
- [ ] When status is `failed`, the badge shows "failed".
- [ ] `StagePill` continues to render stage-level status (`queued`, `running`, `done`) using the existing Badge variants.
- [ ] No new `RunStage` keys are added — the five existing keys (`parse`, `resolve`, `research`, `synthesize`, `draft`) are sufficient.

### C5 — Delete request
- [ ] Each request card in the left rail shows a trash icon button that is hidden by default and revealed on hover (`group-hover` pattern or CSS opacity transition).
- [ ] `AppContext` exposes `deleteRequest(id: string): void`.
- [ ] `deleteRequest` removes the entry from `requests` and writes the updated array to localStorage.
- [ ] If the deleted request was `selectedId`, the selection advances to the next request in the list; if none remain, `selectedId` is set to `''` and the empty state renders.
- [ ] The trash button click does not propagate to the card's `onClick` (stop propagation).

### C6 — Redraft flow
- [ ] When `selectedRequest.status === 'ready'`, the Outreach studio header area includes a "Redraft" button alongside the channel tabs.
- [ ] Clicking Redraft opens an inline form (no modal, no route change) within the Outreach studio containing: a Tone selector (same options as intake: respectful / direct / warm) and a Channel selector (email / LinkedIn DM / X DM), plus a "Generate" button and an "Cancel" link.
- [ ] Tone and Channel selectors pre-populate with the current request's `input.tone` and `input.preferredChannel`.
- [ ] `AppContext` exposes `redraft(id: string, tone: Tone, channel: Channel): void`.
- [ ] In mock mode: `redraft` updates `input.tone` and `input.preferredChannel` on the request, sets status to `running`, then re-runs `scheduleProgress`. The resulting simulated output replaces the outreach packet.
- [ ] In API mode: `redraft` calls `redraftRequest(id, tone, channel)` from `src/lib/api.ts` and then subscribes to SSE updates.
- [ ] After redraft completes, the inline form closes and the Outreach studio shows the new deliverable.
- [ ] Cancelling closes the inline form with no state change.

### C7 — API client module
- [ ] `src/lib/api.ts` exists and exports exactly these five functions with the correct TypeScript signatures:
  - `createRequest(input: RequestInput): Promise<{ id: string; status: string; createdAt: string }>`
  - `fetchRequests(): Promise<DiligenceRequest[]>`
  - `fetchRequest(id: string): Promise<DiligenceRequest>`
  - `subscribeToEvents(id: string, onEvent: (event: { type: string; payload: unknown }) => void): () => void` (returns unsubscribe function)
  - `redraftRequest(id: string, tone: Tone, channel: Channel): Promise<void>`
- [ ] The module reads `import.meta.env.VITE_API_BASE` to determine the base URL.
- [ ] If `VITE_API_BASE` is not set or is an empty string, all functions throw a typed `MockModeError` (or equivalent sentinel) so the caller can detect mock mode and fall back.
- [ ] `subscribeToEvents` uses native `EventSource`; it returns a cleanup function that calls `.close()`.
- [ ] `npm run lint` passes with this module in place (strict TypeScript, no `any` where avoidable).

### C8 — Connect AppContext to API
- [ ] `AppContext` detects mock mode by attempting to call `fetchRequests()` and catching `MockModeError` (or checking `VITE_API_BASE`), then falling back to `seededCases` + `localStorage`.
- [ ] In API mode, `submitDraft` calls `createRequest(draft)` and then `subscribeToEvents` to advance stages, replacing `scheduleProgress`.
- [ ] In API mode, the SSE event `request.ready` causes the context to call `fetchRequest(id)` to hydrate the full request (research + outreach packets).
- [ ] In mock mode, the existing `localStorage` load + `seededCases` fallback + `scheduleProgress` behavior is preserved exactly.
- [ ] "Load PG example" and "Load a16z example" continue to work in both modes (they only mutate the draft form, not the requests list).
- [ ] No regressions: the two seeded demo cases remain visible and selectable after page load in mock mode.

### C9 — Loading states
- [ ] A CSS spinner (no library) is shown in the left rail while `fetchRequests()` is in flight on initial load.
- [ ] The "Run due diligence" button shows a spinner and is disabled while `submitDraft` is in flight.
- [ ] The Research board and Outreach studio show a spinner overlay (or skeleton card) while `fetchRequest(id)` is in flight for the detail view in API mode.
- [ ] In mock mode, the submit button disables for the duration of `scheduleProgress` (from submit until the last timeout fires at 5 s).
- [ ] Spinners use only Tailwind utility classes (`animate-spin`, `border`, etc.) — no new component library.

## UX notes

- All empty states use dashed borders and neutral-50 backgrounds (matching the existing pattern at line 477 of `Console.tsx`).
- The failed error card uses `border-red-200 bg-red-50` (consistent with the amber/red tokens already present on the "Avoid" card in the recommended wedge section).
- The redraft inline form matches the glassmorphism style of the intake form selectors — `bg-brand-blue-100/35` pill tabs, white selected state with shadow-sm.
- The trash icon should be `lucide-react`'s `Trash2` at `h-4 w-4` to match existing icon sizing.
- Spinner: a `w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin` inline element is sufficient.
- Stage name shown in the left rail badge should be the `label` field of the active `RunStage`, not the `key` (e.g. "Research" not "research").

## Edge cases

| Scenario | Behavior |
|---|---|
| User deletes the only remaining request | `requests` becomes `[]`, `selectedId` becomes `''`, all empty states render. |
| User submits while a run is still in progress | The new request is prepended to the list; the in-progress run continues on the previous request. The submit button is disabled only for the new submission's duration. |
| `localStorage` contains a `failed` request from a previous session | It loads correctly; the failed badge and error card render without errors. |
| Redraft is triggered while another redraft is already running | The "Generate" button is disabled during the in-flight redraft. |
| `VITE_API_BASE` is set but the server is unreachable | `fetchRequests()` rejects with a network error (not `MockModeError`). AppContext should surface this as a top-level error state (toast or inline message). Do not silently fall back to mock mode on network failure — only fall back on `MockModeError`. |
| SSE connection drops mid-run in API mode | The `subscribeToEvents` cleanup is called on unmount. Re-connection logic is out of scope; the request stays in "running" state until the user refreshes. |
| `selectedRequest` is `undefined` after deletion | All downstream renders guard against `undefined` — no unhandled null access. |
| Redraft with the same tone and channel as current | Allowed — treat it as a regenerate. |

## Security / privacy / compliance

- All data is frontend-only in mock mode; nothing leaves the browser.
- `localStorage` key `outreachos-reset-front` may contain the user's brief text (potentially sensitive target names). No change to this behavior in this spec — it is pre-existing.
- In API mode, `RequestInput` (including `targetBrief`) is sent to `VITE_API_BASE` over HTTPS. The API client must not transmit credentials beyond what the host provides; no auth header is added by the client module in this iteration.
- No PII is logged to `console` by any new code introduced in this track.

## Type changes needed

### `src/types.ts`
```typescript
// Before
export type RequestStatus = 'running' | 'ready';

// After
export type RequestStatus = 'running' | 'ready' | 'failed';
```

### `src/components/ui/Badge.tsx`
```typescript
// Add to badgeVariants.variants.variant:
failed: 'border-red-200 bg-red-50 text-red-700',
```

### `src/store/AppContext.tsx` — AppContextValue additions
```typescript
type AppContextValue = {
  // ... existing fields ...
  isLoading: boolean;              // true during initial fetchRequests or submitDraft in flight
  deleteRequest: (id: string) => void;
  retryRequest: (id: string) => void;
  redraft: (id: string, tone: Tone, channel: Channel) => void;
};
```

### `src/lib/api.ts` — new file
```typescript
export class MockModeError extends Error {}

export function createRequest(input: RequestInput): Promise<{ id: string; status: string; createdAt: string }>;
export function fetchRequests(): Promise<DiligenceRequest[]>;
export function fetchRequest(id: string): Promise<DiligenceRequest>;
export function subscribeToEvents(
  id: string,
  onEvent: (event: { type: string; payload: unknown }) => void
): () => void;
export function redraftRequest(id: string, tone: Tone, channel: Channel): Promise<void>;
```

## Open questions

1. **Error message content for failed state.** The mock agent never actually fails. The spec assumes the `failed` status only appears when loaded from localStorage or set programmatically. Should the `DiligenceRequest` type carry an `errorMessage?: string` field so the error card can show a specific reason? Assumption: add the optional field; render it if present, show the generic fallback message if absent.

2. **Retry behavior in API mode.** Does retry create a new request ID or reuse the existing one? Assumption: in API mode, retry calls `POST /requests` with the same input (new ID); the old failed request is removed from the list. This matches the mock mode behavior.

3. **Redraft packet replacement.** In mock mode, does redraft replace the entire `OutreachPacket` or only the preferred channel's `Deliverable`? Assumption: replace the entire `OutreachPacket` (all three channels), since `createSimulatedRequest` generates all three and the user can preview any channel.

4. **Left rail "stage name" while queued.** If a request has just been submitted and all stages are still `queued`, what does the badge show? Assumption: show "queued" using the `neutral` badge variant until the first stage transitions to `running`.
