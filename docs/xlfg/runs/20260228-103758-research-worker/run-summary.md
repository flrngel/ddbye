# Run Summary: Research Worker (Track B)

## What changed

Created `worker/` package implementing `runDiligence(input, onProgress)` — the core research worker that replaces the frontend simulation with real Claude Agent SDK calls.

### Files created/modified

| File | Purpose |
|---|---|
| `worker/package.json` | Package: `@outreachos/worker`, deps on `@anthropic-ai/claude-agent-sdk` + `zod` |
| `worker/tsconfig.json` | Strict TypeScript, ESNext, NodeNext |
| `worker/src/types.ts` | Mirrored types from `src/types.ts` + internal pipeline types |
| `worker/src/errors.ts` | WorkerConfigError, UnresolvableTargetError, AgentQueryError |
| `worker/src/schemas.ts` | Zod schemas for each pipeline step structured output |
| `worker/src/agent.ts` | `runStep<T>()` helper wrapping SDK `query()` |
| `worker/src/prompts.ts` | System prompts + user prompt builders for all 6 steps |
| `worker/src/pipeline.ts` | Step functions with progress callbacks |
| `worker/src/index.ts` | Entry point: `runDiligence()` + type re-exports |
| `worker/src/cli.ts` | CLI test harness |
| `worker/test-fixtures/pg-hn-input.json` | PG/HN test input |
| `.gitignore` | Added `.xlfg/` |
| `docs/xlfg/` | XLFG scaffolding + run artifacts |

## How to test / smoke steps

```bash
# Type check
cd worker && npm install --no-fund --no-audit && npm run lint

# Manual smoke test (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-... npx tsx src/cli.ts test-fixtures/pg-hn-input.json
```

## Verification commands run

| Command | Exit code | Log path |
|---|---|---|
| `cd worker && npm run lint` | 0 | `.xlfg/runs/20260228-103758-research-worker/verify/20260228-185003/lint.log` |

## Post-deploy monitoring

No monitoring needed: this is a prototype-stage library package with no deployment target. The worker is consumed by the server layer (Track A) which handles its own monitoring. The worker itself is stateless and has no persistent side effects.

## Rollback plan

All changes are in `worker/` (new files only) plus `.gitignore` (one line added). Rollback:

```bash
git checkout -- .gitignore
rm -rf worker/src worker/package.json worker/tsconfig.json worker/test-fixtures worker/package-lock.json worker/node_modules
```
