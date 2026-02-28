# Parallel TODO

Four isolated tracks with **zero file overlap**. Each track has its own spec in `todos/` and can be worked on by a separate engineer in a worktree or branch.

## Tracks

| Track | File | Owns | Tasks |
|-------|------|------|-------|
| **A** | [todos/track-a-api-server.md](todos/track-a-api-server.md) | `server/**` | 9 — Express/Hono API, REST endpoints, SSE, persistence |
| **B** | [todos/track-b-research-worker.md](todos/track-b-research-worker.md) | `worker/**` | 10 — Claude Agent SDK, 6-step pipeline, structured output |
| **C** | [todos/track-c-frontend-polish.md](todos/track-c-frontend-polish.md) | `src/**`, `index.html` | 9 — empty/error states, delete, redraft, API client, loading |
| **D** | [todos/track-d-quality-ci.md](todos/track-d-quality-ci.md) | `tests/**`, `.github/**`, root configs | 8 — ESLint, Vitest, Playwright, CI pipeline |

## File ownership (no overlap)

```
server/**                → Track A only
worker/**                → Track B only
src/**  +  index.html    → Track C only
tests/**  +  .github/**  → Track D only
root configs (eslint, prettier, vitest, playwright)  → Track D only
root package.json        → Track D (devDeps + scripts only)
```

**Read-only shared references** (no track edits these):
- `src/types.ts` — Track A and B may read for type definitions
- `docs/`, `contracts/` — all tracks may read

## Dependency graph

```
A (server)   ──┐
B (worker)   ──┼──▶  Integration (after all 4 merge)
C (frontend) ──┤
D (quality)  ──┘
```

Integration work after merge:
- Wire server → worker dispatch (A9 + B10)
- Wire frontend → real API (C7/C8 + A3–A6)
- CI validates the full stack (D8)
