# Spec — Merge All Worktrees

## Goal
Merge 4 parallel feature branches into main without squashing, resolve all conflicts, and ensure the integrated codebase passes lint and tests.

## Acceptance criteria
1. All 4 feature branches merged into main with merge commits (no squash, no rebase)
2. All merge conflicts resolved correctly (docs/xlfg/knowledge files combined)
3. `npm run lint` (tsc --noEmit) passes
4. `npx vitest run` passes (unit tests from Track D)
5. `npx eslint .` passes or has only warnings
6. Worktrees cleaned up after successful merge
7. All original commits preserved in history

## Merge order rationale
1. **Track D first** — adds testing/linting infra that subsequent merges benefit from
2. **Track A** — new `server/` directory, no source conflicts
3. **Track B** — new `worker/` directory, no source conflicts
4. **Track C** — modifies existing frontend files, merge last to catch any type issues

## Known conflict resolution strategy
- `docs/xlfg/knowledge/*.md` — combine all entries from all branches
- `docs/xlfg/index.md` — combine run references from all branches
- `.gitignore` — combine all entries

## Out of scope
- Running Playwright e2e tests (requires browser + dev server)
- Deploying or pushing to remote
- Modifying any production code beyond what's needed to fix integration issues
