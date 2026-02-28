# Plan: Research Worker (Track B)

## Summary

Build the `worker/` package implementing `runDiligence(input, onProgress)` using the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). The worker runs a 6-step pipeline (parse → resolve → research → synthesize → draft → quality gate) where each step is a separate `query()` call with structured output via Zod-generated JSON schemas. WebSearch and WebFetch are used only in steps that need web access (resolve, research).

## Tasks

- [x] **T1: Package setup + types + errors** (B1, B9 partial, B10 partial)
  - Create `worker/package.json` with `@anthropic-ai/claude-agent-sdk` and `zod` deps
  - Create `worker/tsconfig.json` (strict, ESNext, NodeNext)
  - Create `worker/src/types.ts` — mirror all types from `src/types.ts` plus internal types (`ParsedJob`, `ResolvedTarget`, `ProgressEvent`, `OnProgress`, `WorkerResult`)
  - Create `worker/src/schemas.ts` — Zod schemas for each pipeline step output
  - Create `worker/src/errors.ts` — `WorkerConfigError`, `UnresolvableTargetError`, `AgentQueryError`

- [x] **T2: Agent scaffold + step runner** (B2, B10)
  - Create `worker/src/agent.ts` — `runStep<T>()` helper that wraps `query()`, handles message stream, extracts `structured_output`, throws on error subtypes
  - Configure `permissionMode: "bypassPermissions"` and per-step `systemPrompt`/`allowedTools`
  - Validate `ANTHROPIC_API_KEY` at startup

- [x] **T3: Pipeline steps + prompts** (B3-B8)
  - Create `worker/src/prompts.ts` — system prompts and user prompt builders for each step
  - Create `worker/src/pipeline.ts` — orchestration of the 6 steps with progress callbacks
    - `stepParse(input)` → `ParsedJob` (no web tools)
    - `stepResolve(job)` → `ResolvedTarget` with WebSearch/WebFetch; throw `UnresolvableTargetError` if `surface` is empty
    - `stepResearch(job, target, focuses)` → `{ contextCards, evidence }` with WebSearch/WebFetch
    - `stepSynthesize(job, target, contextCards, evidence)` → `{ recommendedAngle, whyThisTarget }` (no web tools)
    - `stepDraft(job, research, outreachConfig)` → `OutreachPacket` (no web tools)
    - `stepQualityGate(outreach, research)` → check violations, re-run draft once if needed (no web tools)
  - Create `worker/src/index.ts` — export `runDiligence()` entry point with `onProgress` callback wrapping, error safety for callback throws

- [x] **T4: CLI test harness** (testing + integration)
  - Create `worker/src/cli.ts` — reads a JSON input from argv/stdin, calls `runDiligence()`, prints progress to stderr, prints result to stdout
  - Create `worker/test-fixtures/pg-hn-input.json` from `contracts/request.create.example.json`

## Definition of done

1. `cd worker && npm install && npm run lint` passes (tsc --noEmit)
2. `worker/src/index.ts` exports `runDiligence`, `ProgressEvent`, `OnProgress`, `WorkerResult`
3. `worker/src/errors.ts` exports `WorkerConfigError`, `UnresolvableTargetError`, `AgentQueryError`
4. All types match `src/types.ts` shapes exactly
5. Every pipeline step has its own system prompt enforcing relevant safety rules
6. Quality gate checks all 5 prohibited patterns
7. Evidence items have provenance (`sourceType`, `sourceLabel`, `confidence`, `usedFor`)
8. Progress events emit `{ stage, status: "running" | "done", detail? }` for each stage
9. `onProgress` callback errors are caught and don't abort the pipeline
10. CLI harness (`worker/src/cli.ts`) can be invoked with `npx tsx worker/src/cli.ts worker/test-fixtures/pg-hn-input.json`

## Verification commands

```bash
cd worker && npm install --no-fund --no-audit --prefer-offline
cd worker && npm run lint   # tsc --noEmit
```

## Rollback

All changes are in `worker/`. Rollback = `rm -rf worker/src worker/package.json worker/tsconfig.json worker/test-fixtures`.
