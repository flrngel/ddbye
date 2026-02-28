# Spec

## Problem

The agent worker at `worker/` has never been executed against a real Anthropic API. The code was written against `@anthropic-ai/claude-agent-sdk` v0.1.77 based on available type definitions, but the SDK has subtle behavioral differences from what the worker code assumes. First-contact failures are expected: SDK option field semantics, `outputFormat` schema compatibility, structured output delivery, and Zod schema serialization are all untested. There is no test suite for the worker package.

The goal is to make the 6-step pipeline (`parse → resolve → research → synthesize → draft → quality-gate`) pass end-to-end against real API calls, with each step also covered by an integration test that can be run independently.

## Goals

1. Run the worker CLI with a real API key against `test-fixtures/pg-hn-input.json` and fix every runtime failure discovered.
2. Install Vitest in the worker package and write one integration test per pipeline step (6 tests total), each callable independently without running the full pipeline.
3. Write one end-to-end integration test that runs the complete pipeline and validates the `WorkerResult` shape.
4. Fix any SDK API mismatches found (option field names, schema format, result message handling).
5. Confirm `tsc --noEmit` still passes after all changes.
6. Do not break the existing 36 vitest tests in the root project.

## Non-goals

- Wiring the worker to the server (server still uses stub dispatch). That is a separate task.
- Frontend changes.
- Testing the full Playwright e2e suite (no server dispatch yet).
- CI pipeline changes (worker tests require a real API key; CI without secrets is out of scope).
- Performance optimization or cost reduction.
- Testing with inputs other than the PG/HN fixture unless a new failure mode requires it.

## User stories

- As the implementer, I can run `ANTHROPIC_API_KEY=... npx tsx src/cli.ts test-fixtures/pg-hn-input.json` from the `worker/` directory and see JSON output on stdout with no runtime errors.
- As the implementer, I can run `ANTHROPIC_API_KEY=... npx vitest run` from the `worker/` directory and see all step-level integration tests pass.
- As the implementer, I can run a single step test in isolation (e.g., parse step only) without making 5 extra API calls.
- As a future developer, I can see from the test output exactly which step a failure came from.

## Acceptance criteria

### CLI smoke test
- [ ] Running `ANTHROPIC_API_KEY=<key> npx tsx src/cli.ts test-fixtures/pg-hn-input.json` from `worker/` exits 0 and prints valid JSON to stdout.
- [ ] The JSON output satisfies the `WorkerResult` shape: `.research` is a `ResearchPacket`, `.outreach` is an `OutreachPacket`.
- [ ] The `ResearchPacket` has `person` = "Paul Graham", `organization` = "Y Combinator", `surface` = "Hacker News" (or equivalent correct resolution).
- [ ] The `ResearchPacket.evidence` array contains at least 3 items, each with a non-empty `id`, `claim`, and valid `sourceType` ("Public web" | "User brief" | "Inference").
- [ ] The `OutreachPacket.email.subjects` array contains 2-3 items.
- [ ] Progress events are emitted to stderr in order: `parse running`, `parse done`, `resolve running`, `resolve done`, `research running`, `research done`, `synthesize running`, `synthesize done`, `draft running`, `draft done`.

### Step-level integration tests (vitest, worker package)
- [ ] A vitest config exists at `worker/vitest.config.ts` (or `worker/vitest.config.mts`).
- [ ] `vitest` and `@vitest/coverage-v8` (or similar) are listed in `worker/package.json` devDependencies.
- [ ] Test file `worker/tests/integration/pipeline.test.ts` exists (or equivalent path under `worker/tests/`).
- [ ] Parse step test: calls `stepParse(pgHnInput, noop)`, asserts result has `targetHypothesis` containing "Hacker News", `preferredChannel === "email"`, `focusAreas.length >= 3`.
- [ ] Resolve step test: calls `stepResolve(parsedJob, noop)` with a hand-crafted `ParsedJob`, asserts `result.surface` is non-empty and `result.person` is non-empty.
- [ ] Research step test: calls `stepResearch(parsedJob, resolvedTarget, noop)`, asserts `result.contextCards.length >= 1` and `result.evidence.length >= 1`.
- [ ] Synthesize step test: calls `stepSynthesize(parsedJob, resolvedTarget, researchContext, noop)`, asserts `result.recommendedAngle.headline` is non-empty and `result.whyThisTarget.length >= 1`.
- [ ] Draft step test: calls `stepDraft(parsedJob, resolvedTarget, synthesisResult, noop)`, asserts `result.email.subjects` has 2-3 items and `result.email.body` is non-empty.
- [ ] Quality gate step test: calls `stepQualityGate(outreachPacket, evidence, parsedJob, resolvedTarget, synthesisResult, noop)`, asserts the returned `outreach` and `qualityWarnings` fields both exist and have correct types.
- [ ] End-to-end test: calls `runDiligence(pgHnInput, progressLogger)`, asserts the full `WorkerResult` shape passes Zod validation against a combined schema.
- [ ] All tests that require `ANTHROPIC_API_KEY` are skipped (via `test.skipIf(!process.env.ANTHROPIC_API_KEY)`) when the key is absent, so `tsc` and offline lint still pass.
- [ ] All tests use a generous timeout (90 seconds per test minimum, 300 seconds for e2e) because real API calls include web search latency.

### SDK correctness fixes
- [ ] The `tools` option is used (not `allowedTools`) to control which tools the SDK makes available to the model. Steps with no web access pass `tools: []`. Steps with web access pass `tools: ["WebSearch", "WebFetch"]`. Per knowledge base: `allowedTools` is an auto-allow list, not a restriction.
- [ ] `allowedTools` is retained or removed consistently with its correct meaning (auto-approve without prompting). It is not used as a restriction mechanism.
- [ ] `outputFormat.schema` is a plain JSON Schema object (as produced by `z.toJSONSchema()`). If the SDK rejects nested `$defs` or `$schema` annotations, the schema is preprocessed to strip them before passing.
- [ ] The result message handler covers the `error_max_structured_output_retries` subtype explicitly, logging a useful error message rather than falling through to the generic "Agent loop ended without a result message" error.
- [ ] `permissionMode: "bypassPermissions"` and `allowDangerouslySkipPermissions: true` are confirmed correct for headless operation and remain in place.

### Type correctness
- [ ] `tsc --noEmit` passes in `worker/` after all changes.
- [ ] The root project's `tsc --noEmit` still passes.
- [ ] The 36 existing vitest tests in the root project still pass.

## UX notes

Not applicable — the worker is a headless Node.js process with no UI. The CLI output (stderr progress + stdout JSON) is the developer-facing interface. No copy changes required.

## Edge cases

### SDK option semantics mismatch (known risk, per context.md)
The `allowedTools` field in SDK v0.1.77 is documented as "auto-allowed without prompting" — it is NOT a restriction list. The worker currently passes `allowedTools: ["WebSearch", "WebFetch"]` for research steps and `allowedTools: []` for reasoning-only steps, treating it as a restriction. This is the primary suspected API mismatch. Fix: use the `tools` option to set the available tool list per step. Verify by reading the `Options.tools` type: `string[] | { type: 'preset'; preset: 'claude_code' }`. An empty array `[]` disables all built-in tools. Steps that should not have web access must pass `tools: []`.

### Zod v4 `toJSONSchema` output compatibility
The worker uses `z.toJSONSchema(schema)` from `zod/v4` (available in zod@3.25.x via forward-compat bridge). The output may include a top-level `$schema` key or internal `$defs` references that the SDK's structured output feature does not accept. If the SDK throws a validation error on the schema shape, add a preprocessing step to strip `$schema` and flatten `$defs` before passing `outputFormat.schema`. Test this on the parse step (simplest schema) first.

### Structured output retry failure
The `SDKResultMessage` error subtypes include `error_max_structured_output_retries`. This means the SDK attempted to produce structured output but failed after retries. The worker's current catch block in `runStep()` does not handle this subtype distinctly — it falls to `throw new AgentQueryError("Agent step failed with subtype: error_max_structured_output_retries")`. The test must verify the error message is actionable. If this error occurs in practice, schema simplification (narrower schemas, remove `.describe()` on nested fields) is the fix per pattern "Zod schema strategy for Agent SDK" in `docs/xlfg/knowledge/patterns.md`.

### UnresolvableTargetError in resolve step
If the model cannot determine `surface` from the brief, `stepResolve` throws `UnresolvableTargetError`. The integration test for the resolve step must assert the surface is non-empty for the PG/HN fixture (well-known target, should always resolve). If it fails in practice, the system prompt for resolve needs strengthening.

### Evidence ID format constraint
`buildResearchPrompt` instructs the model to use `"ev_3_N"` format for evidence IDs. The model may deviate (using `"ev1"`, `"1"`, etc.). The Zod schema for `EvidenceItemSchema.id` is `z.string()` (no format constraint), so this will not cause schema validation failures. However, if the quality gate prompt references evidence by ID, mismatched IDs could cause logic issues. This is acceptable for MVP — log a warning if the ID format does not match the expected pattern but do not fail.

### X DM 280-character constraint
The draft prompt asks for X DM body under 280 characters "if possible". The schema does not enforce this. The quality gate does not check it either. If the model violates this, it is caught as a soft warning, not a hard error. No fix required for this run.

### `safeProgress` callback isolation
`safeProgress` in `pipeline.ts` swallows errors thrown by `onProgress` callbacks. This is correct behavior. Integration tests that use a noop progress function will not be affected.

### API key validation timing
`validateApiKey()` in `agent.ts` throws `WorkerConfigError` synchronously before any async calls. The integration tests must set `ANTHROPIC_API_KEY` in the test environment before calling any step function. Tests must NOT hardcode the key value.

## Security / privacy / compliance

- `ANTHROPIC_API_KEY` must be read from `process.env` only. Never hardcoded in test files or fixtures.
- Test fixtures (`pg-hn-input.json`) contain only publicly-known figures (Paul Graham, Y Combinator). No PII concerns with this fixture.
- Web search results fetched during the test are ephemeral and not persisted beyond the test run output.
- If test output is logged to a file, it may contain web-fetched content (URLs, summaries). Do not commit test output files containing real API responses.
- The `allowDangerouslySkipPermissions: true` flag bypasses Claude Code's file system and shell tool guards. The worker's `tools: []` (for non-web steps) and `tools: ["WebSearch", "WebFetch"]` (for web steps) must be verified to actually prevent file system access during the battle test. If the model attempts a `Bash` or `Write` tool call during a web-only step, that is a security misconfiguration — the test should fail and the `tools` restriction should be confirmed to work.

## Implementation order

The implementer should follow this sequence to minimize wasted API calls:

1. **Install Vitest in worker package** — add `vitest` to devDependencies, create `worker/vitest.config.ts`.
2. **Write the parse step test** — simplest test, no web tools, exercises the Zod schema path end-to-end. This is the canary for `outputFormat` and `z.toJSONSchema()` compatibility.
3. **Run the parse step test** — fix SDK option mismatches and schema issues found here before proceeding.
4. **Fix `tools` vs `allowedTools` mismatch** — update `runStep` to accept a `tools` option and thread it through each pipeline step call.
5. **Write and run the resolve step test** — first test with web tools.
6. **Write and run the remaining step tests** (research, synthesize, draft, quality-gate) — each in sequence.
7. **Write and run the e2e test** (`runDiligence`).
8. **Run the CLI** and confirm stdout JSON is valid.
9. **Run `tsc --noEmit`** in worker/ and in root. Fix any type errors.
10. **Run root vitest** — confirm 36 tests still pass.

## Open questions

- **Q1**: Does the SDK's `tools: []` option actually prevent the model from calling `WebSearch`/`WebFetch` during reasoning-only steps, or does it only affect locally-defined tools? The type definition says `[]` "disables all built-in tools" — this should be confirmed empirically during the parse step test.
- **Q2**: Does `z.toJSONSchema()` from `zod/v4` produce a `$schema` annotation that causes the SDK to reject the schema? If yes, what is the minimal preprocessing required (strip `$schema`? strip `$defs`?)?
- **Q3**: The `outputFormat` field takes `schema: JsonSchema` (the SDK's `JsonSchemaOutputFormat` type). Is the SDK's JSON schema validator strict about unknown keys (e.g., `description` on properties)? Assumption: it is permissive, but this must be verified empirically.
- **Q4**: Should each integration test use pre-canned step inputs (hand-crafted fixtures) or chain off the previous step? Assumption: use hand-crafted `ParsedJob`, `ResolvedTarget`, etc. fixtures for all step tests except the e2e test. This isolates each step and avoids cascading failures.

## References

- Per pattern "Claude Agent SDK: `runStep<T>()` pattern" (`docs/xlfg/knowledge/patterns.md`): `allowedTools` is the auto-allow list; `tools` controls availability. This pattern was established during initial worker implementation.
- Per pattern "Zod schema strategy for Agent SDK" (`docs/xlfg/knowledge/patterns.md`): use one narrow schema per step; complex schemas increase structured output retry failures.
- Per decision "2026-02-28: Resolve step (step 2) keeps WebSearch/WebFetch tools" (`docs/xlfg/knowledge/decision-log.md`): step 2 intentionally has web tools.
- Per testing note "Worker testing" (`docs/xlfg/knowledge/testing.md`): runtime testing requires a valid API key; tests should skip gracefully when the key is absent.
