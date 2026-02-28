# Track C: Frontend Polish

## Ownership

- **You own:** `src/**`, `index.html`
- **Do not touch:** `server/`, `worker/`, `tests/`, root config files (`.eslintrc`, `.prettierrc`, `vitest.config.*`, `playwright.config.*`), `.github/`

## Reference docs

- `docs/02_ux-reset.md` — UX principles and design system
- `docs/03_console-page-spec.md` — console page spec (left rail, composer, research board, outreach studio)
- `docs/05_api-worker-contracts.md` — API endpoints and SSE events the frontend will consume

## Current state

The frontend prototype is fully functional with mock data. What's missing: error states, empty states, detailed lifecycle, delete, redraft, and the API connection layer.

## Tasks

### C1: Fix HTML title
- Change `index.html` `<title>` from "My Google AI Studio App" to "Outreach OS"
- One line change

### C2: Empty state
- When `requests` array is empty, show a guidance card in the left rail
- Something like: "No requests yet. Write a brief and run your first due diligence."
- Also handle the main workspace area (research board + outreach studio) when nothing is selected

### C3: Failed state UI
- Add `'failed'` to the `RequestStatus` type in `src/types.ts`
- In `Console.tsx`, render an error card when `selectedRequest.status === 'failed'`
- Show a retry button that re-submits the same input
- Style with a red/amber error treatment consistent with the design system

### C4: Detailed run states
- The production lifecycle has: queued, parsing, resolving, researching, synthesizing, drafting, ready, failed
- Update the `StagePill` component and the `Badge` variants to handle these states
- The left rail request cards should show the current stage name, not just "running"

### C5: Delete / archive request
- Add a delete button (trash icon) on each request card in the left rail
- Only show on hover to keep the UI clean
- Add `deleteRequest(id: string)` to `AppContext`
- Remove from `requests` array and update localStorage
- If the deleted request was selected, select the next one (or show empty state)

### C6: Redraft flow
- After a request is `ready`, show a "Redraft" button in the outreach studio
- Clicking it opens a small inline form to change tone and/or channel
- Add `redraft(id: string, tone: Tone, channel: Channel)` to `AppContext`
- In mock mode: re-run `createSimulatedRequest` with the updated input and replace the outreach packet
- In API mode: call `POST /requests/:id/redraft`

### C7: API client module
- Create `src/lib/api.ts` with these functions:
  - `createRequest(input: RequestInput): Promise<{ id, status, createdAt }>`
  - `fetchRequests(): Promise<DiligenceRequest[]>`
  - `fetchRequest(id: string): Promise<DiligenceRequest>`
  - `subscribeToEvents(id: string, onEvent: callback): () => void` (returns unsubscribe)
  - `redraftRequest(id: string, tone: Tone, channel: Channel): Promise<void>`
- Use native `fetch` and `EventSource` — no new dependencies
- Detect mock mode: if the API base URL is not set or the server is unreachable, fall back to the current mock behavior

### C8: Connect AppContext to API
- Replace the initial `localStorage` load with `fetchRequests()` (falling back to seeded cases in mock mode)
- Replace `scheduleProgress()` timer chain with `subscribeToEvents()` SSE subscription
- Replace `createSimulatedRequest()` with `createRequest()` API call
- Keep the mock fallback so the demo still works without a server

### C9: Loading states
- Add a loading spinner or skeleton when:
  - Requests are being fetched on initial load
  - A new request is being submitted
  - A full request is being fetched for the detail view
- Use a simple CSS spinner — no new dependencies needed

## Done criteria

- `index.html` title says "Outreach OS"
- With zero requests: left rail and workspace show helpful empty states
- A failed request shows an error card with a retry option
- Left rail shows the current stage name (e.g. "researching") instead of just "running"
- Requests can be deleted from the left rail
- A ready request can be redrafted with a different tone/channel
- `src/lib/api.ts` exists with all 5 functions
- The app still works in mock mode (no server needed) with the same demo flow
- No regressions: existing seeded cases and "Load PG example" / "Load a16z example" still work
- `npm run lint` passes (tsc --noEmit)
