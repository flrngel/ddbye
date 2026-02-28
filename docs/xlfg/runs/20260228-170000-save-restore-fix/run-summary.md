# Run Summary

## What changed
Fixed save/restore bugs in `src/store/AppContext.tsx`:
- Mock mode: stale "running" requests now marked "failed" on page refresh
- API mode: re-subscribes to SSE for in-progress requests after refresh

## Verification
- `tsc --noEmit`: GREEN
- `vite build`: GREEN (322 KB)
- Checker: ACCEPT

## Post-deploy monitoring
No monitoring needed: frontend-only state management fix, no server changes.
