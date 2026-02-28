# Plan — Merge All Worktrees

## Tasks

- [x] **T1**: Merge feat/track-d into main (quality & CI layer)
- [x] **T2**: Merge feat/track-a into main (API server), resolve docs/xlfg conflicts
- [x] **T3**: Merge feat/track-b into main (research worker), resolve docs/xlfg conflicts
- [x] **T4**: Merge feat/track-c into main (frontend polish), resolve docs/xlfg conflicts
- [x] **T5**: Install dependencies and fix integration issues (lint, type errors, test failures)
- [x] **T6**: Clean up worktrees and branches

## Definition of done
- All branches merged into main with merge commits
- `npm run lint` passes
- `npx vitest run` passes
- All worktrees removed
- All feature branches deleted (local only)

## Verification commands
```bash
npm install --no-fund --no-audit --prefer-offline
npm run lint
npx vitest run
npx eslint . --max-warnings=999
```

## Rollback
If merge goes wrong: `git reset --hard 34f98ee` (current main HEAD)
