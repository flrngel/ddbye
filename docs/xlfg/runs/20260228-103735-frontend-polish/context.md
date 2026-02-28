# Context

## Raw request

Implement all 9 tasks from `todos/track-c-frontend-polish.md`:

- C1: Fix HTML title (→ "Outreach OS")
- C2: Empty state (left rail + workspace)
- C3: Failed state UI (add `failed` status, error card, retry)
- C4: Detailed run states (stage names in left rail instead of "running")
- C5: Delete/archive request (hover trash icon, AppContext method, selection fix)
- C6: Redraft flow (tone/channel inline form, mock + API mode)
- C7: API client module (`src/lib/api.ts` with 5 functions)
- C8: Connect AppContext to API (with mock fallback)
- C9: Loading states (spinner for fetch, submit, detail view)

## Assumptions

- Mock mode must keep working — no server needed for demo
- No new npm dependencies (use native fetch + EventSource)
- The `failed` status is frontend-only for now (mock agent never actually fails, but the UI should handle it)
- API base URL detection: use `import.meta.env.VITE_API_BASE` or absent = mock mode
- Redraft in mock mode: re-run simulation with updated tone/channel
- Loading states use CSS spinner, no skeleton library

## Constraints

- **File ownership:** `src/**`, `index.html` only. Do not touch `server/`, `worker/`, `tests/`, root configs, `.github/`
- **Lint check:** `npm run lint` (tsc --noEmit) must pass
- **No regressions:** Seeded cases and "Load PG/a16z example" must work
- **Design system:** Continue using existing Tailwind v4 + cva patterns, rounded glassmorphism style
- **OS:** macOS, Vite 7 dev server

## Chosen approach

Implement all 9 tasks in order (C1-C9), building on each other. The API client (C7-C8) will be structured so mock fallback is seamless.
