# Plan: Frontend Polish (Track C)

## Summary

Implement 9 frontend polish tasks (C1-C9) across `src/` and `index.html`. The changes add missing UI states (empty, failed, loading), detailed run stage visibility, user controls (delete, redraft), and an API client module with mock fallback.

## Tasks

- [x] **T1: Types + Badge + Title** — Update `RequestStatus` type, add `failed` Badge variant, add `errorMessage?` to `DiligenceRequest`, fix HTML title. Files: `index.html`, `src/types.ts`, `src/components/ui/Badge.tsx`
- [x] **T2: Empty states** — Add empty state cards to left rail, Research board, and Outreach studio when no requests or no selection. Files: `src/pages/Console.tsx`
- [x] **T3: Failed state + Retry** — Add error card for failed requests, retry button, `retryRequest()` in AppContext. Files: `src/pages/Console.tsx`, `src/store/AppContext.tsx`
- [x] **T4: Detailed run states + Delete** — Show active stage label in left rail badge, add hover trash icon, `deleteRequest()` in AppContext with selection advance. Files: `src/pages/Console.tsx`, `src/store/AppContext.tsx`
- [x] **T5: Redraft flow** — Add Redraft button + inline form in Outreach studio, `redraft()` in AppContext, mock mode re-simulation. Files: `src/pages/Console.tsx`, `src/store/AppContext.tsx`, `src/logic/mockAgent.ts`
- [x] **T6: API client + AppContext connection + Loading** — Create `src/lib/api.ts`, connect AppContext with mock fallback, add loading states. Files: `src/lib/api.ts`, `src/store/AppContext.tsx`, `src/pages/Console.tsx`

## Definition of done

- `npm run lint` passes (tsc --noEmit)
- All 9 C-tasks from `todos/track-c-frontend-polish.md` are complete
- Mock mode works without a server (seeded cases, Load PG/a16z examples)
- Empty, failed, loading, and detailed stage states all render correctly
- Delete and redraft flows work in mock mode

## Verification commands

```bash
npm run lint          # TypeScript type-check
npm run build         # Production build succeeds
npm run dev           # Manual smoke test on localhost:3000
```

## Rollback

All changes are in `src/` and `index.html`. Revert the commit to restore previous state.
