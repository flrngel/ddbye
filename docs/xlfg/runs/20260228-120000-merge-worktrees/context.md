# Context — Merge Worktrees

## Raw request
Merge all worktrees, test and fix things that should be fixed. Do not squash commits.

## Situation
4 feature branches developed in parallel worktrees, each with 2 commits:
- **feat/track-a** (4f50a74): Hono API server with SQLite persistence (`server/`)
- **feat/track-b** (9f13355): Research worker with Claude Agent SDK (`worker/`)
- **feat/track-c** (7e9e5ea): Frontend polish — Console.tsx, AppContext.tsx, api.ts, types.ts, index.html
- **feat/track-d** (6b64b6d): Quality & CI layer — ESLint, Prettier, Vitest, Playwright, GitHub Actions

## Conflict analysis
- No production code conflicts between any pair of branches
- All conflicts are add/add in `docs/xlfg/knowledge/` (5 files created independently by all 4 branches)
- `.gitignore` appended by all 4 branches (will auto-merge or trivially resolve)

## Assumptions
- Merge order: Track D first (provides test infra), then A, B, C
- All docs/xlfg/knowledge conflicts resolved by combining entries from all branches
- After merging, run lint + tests to catch any integration issues
- Fix any issues found (type errors, lint errors, test failures)
- No commit squashing — preserve all original commits via merge commits

## Constraints
- Must preserve commit history (no rebase/squash)
- Must pass `npm run lint` (tsc --noEmit) after all merges
- Should pass Vitest unit tests (added by Track D)
- Should pass ESLint (added by Track D)
