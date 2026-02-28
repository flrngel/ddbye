# Compound Summary — Merge Worktrees

## What was learned

### Cross-track integration bugs are invisible to per-package verification
The most critical bugs (SSE named events, redraft field name) only existed at the boundary between Track A (server) and Track C (frontend). Each package's TypeScript compiled independently. No test exercised the integration path. The bugs were only found by architecture review reading both sides together.

### Knowledge file conflicts are predictable in parallel worktree workflows
All 4 tracks independently created `docs/xlfg/knowledge/` files. This produced 5 identical add/add conflicts on each subsequent merge. The resolution pattern (combine entries from both sides) was mechanical and could be streamlined in future parallel development by having a single track own the initial scaffolding.

### Merge order matters for test infrastructure
Merging Track D (quality/CI) first was the right call — it provided ESLint and Vitest that caught lint issues immediately after subsequent merges. If Track D had been merged last, the lint issues would have accumulated and been harder to attribute.

## What to reuse

- **Merge-tree dry run**: `git merge-tree --write-tree branch1 branch2` to preview conflicts before merging is an excellent pre-flight check
- **SSE listener pattern**: Always use `addEventListener(eventName, ...)` for named SSE events, never `onmessage`
- **`.gitignore` audit**: Always verify `.env` and `.env.*` are covered when adding server-side API keys

## What to avoid

- Don't let parallel tracks independently create the same knowledge/config files — designate one track as the scaffolding owner
- Don't assume TypeScript compilation passing means cross-package contracts are correct — need integration tests or shared type packages
- Don't use `continue-on-error: true` in CI without a specific ticket/condition for when to remove it
