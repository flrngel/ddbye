# Context

## Raw request

Build the research worker (Track B) as defined in `todos/track-b-research-worker.md`.

Create a `worker/` package that implements `runDiligence(input: RequestInput, onProgress: callback)` using the Claude Agent SDK with WebSearch and WebFetch server tools.

## Scope

- **Own:** `worker/**` (all new files)
- **Read-only:** `src/types.ts`, `docs/04_agent-plan-claude-sdk.md`, `contracts/`
- **Do not touch:** `src/`, `server/`, `tests/`, root config files, `index.html`

## Tasks (B1-B10)

1. Init worker package (`worker/package.json`, `worker/tsconfig.json`)
2. Agent scaffold (SDK client, WebSearch/WebFetch tools, `runDiligence` entry point)
3. Step 1 — Parse intake (brief → structured job)
4. Step 2 — Resolve target (fuzzy brief → person/org/surface)
5. Step 3 — Expand context (web research → contextCards)
6. Step 4 — Synthesize wedge (research → recommendedAngle)
7. Step 5 — Generate outreach (3 channel deliverables)
8. Step 6 — Quality gate (check for overclaiming, fake familiarity, etc.)
9. Structured output (match ResearchPacket + OutreachPacket types)
10. Progress callback (onProgress(stage, detail) at each stage)

## Assumptions

- Worker uses `@anthropic-ai/claude-agent-sdk` with `query()` function
- WebSearch and WebFetch are passed as `allowedTools`
- Each pipeline step is a separate `query()` call with structured output (JSON schema)
- Worker is a standalone TypeScript module, not embedded in the frontend
- `ANTHROPIC_API_KEY` env var is required at runtime
- Worker mirrors types from `src/types.ts` but has its own copy to avoid cross-package imports

## Constraints

- TypeScript strict mode
- No modifications to anything outside `worker/`
- Must match `ResearchPacket` and `OutreachPacket` shapes from `src/types.ts`
- Evidence provenance is mandatory (User brief / Public web / Inference)
- Safety rules from doc 04 must be enforced
