# Implementer Report: T1-T4

## Files created

| File | Purpose |
|---|---|
| `worker/package.json` | Package config: `@outreachos/worker`, ESM, deps on `@anthropic-ai/claude-agent-sdk` + `zod` |
| `worker/tsconfig.json` | Strict TS, ESNext target, NodeNext module resolution |
| `worker/src/types.ts` | Mirrored types from `src/types.ts` + internal pipeline types |
| `worker/src/errors.ts` | Three error classes: WorkerConfigError, UnresolvableTargetError, AgentQueryError |
| `worker/src/schemas.ts` | Zod schemas for each pipeline step's structured output |
| `worker/src/agent.ts` | `runStep<T>()` helper wrapping `query()` with structured output extraction |
| `worker/src/prompts.ts` | System prompts + user prompt builders for all 6 steps |
| `worker/src/pipeline.ts` | Step functions: stepParse, stepResolve, stepResearch, stepSynthesize, stepDraft, stepQualityGate |
| `worker/src/index.ts` | Entry point: exports `runDiligence()` + all public types |
| `worker/src/cli.ts` | CLI test harness: reads JSON input, prints progress to stderr, result to stdout |
| `worker/test-fixtures/pg-hn-input.json` | PG/HN test input from contracts |

## Spec coverage

- B1 (package setup): package.json, tsconfig.json created
- B2 (agent scaffold): `runStep()` in agent.ts, `runDiligence()` in index.ts
- B3 (parse): stepParse with ParsedJobSchema, defaults empty focuses to all 5
- B4 (resolve): stepResolve with WebSearch/WebFetch, throws UnresolvableTargetError if surface empty
- B5 (research): stepResearch with WebSearch/WebFetch, builds contextCards + evidence
- B6 (synthesize): stepSynthesize, truncates whyThisTarget to max 3
- B7 (draft): stepDraft with tone/goalType/channel-aware prompts
- B8 (quality gate): stepQualityGate checks all 5 patterns, re-runs draft once on violation
- B9 (structured output): Zod schemas match ResearchPacket + OutreachPacket exactly
- B10 (progress callback): safeProgress wrapper catches callback errors, emits running/done per stage

## Safety rules enforcement

- Resolve prompt: "Never treat the user's fuzzy brief as verified fact"
- Resolve prompt: "surface must be narrower than the organization"
- Code gate: `if (!result.surface)` throws before draft step
- Draft prompt: Explicit "NEVER use these patterns" list
- Quality gate: Checks all 5 prohibited patterns

## Notes

- `permissionMode: "bypassPermissions"` used since worker only has WebSearch/WebFetch
- API key validated before first query call
- Each step is an isolated `query()` call with its own schema (avoids context bloat)
- Quality gate does one retry maximum, returns warnings if retry still has issues
