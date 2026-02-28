# Run Summary

## What changed

Fixed 3 critical bugs that prevented the agent worker from running against the real Anthropic API:

1. **`$schema` stripping** (`worker/src/agent.ts`): `z.toJSONSchema()` emits a `$schema` annotation that the Agent SDK silently rejects — falling back to text output instead of structured JSON. Fix: strip `$schema` before passing to the SDK.

2. **`tools` vs `allowedTools`** (`worker/src/agent.ts`, `worker/src/pipeline.ts`): The SDK's `allowedTools` is an auto-approve list, NOT a restriction. The `tools` option controls which built-in tools are available. Fix: use `tools` to control tool availability per step.

3. **Schema simplification** (`worker/src/schemas.ts`): The `OutreachPacketSchema` used `.extend()` with conflicting optional/required `subjects` fields. The model hit `error_max_structured_output_retries` (5 failed attempts). Fix: separate `EmailDeliverableSchema` (with required subjects) from `DmDeliverableSchema` (no subjects field).

Also improved error handling: explicit messages for empty `structured_output` and detailed error subtypes.

## Verification

- CLI smoke test: `npx tsx src/cli.ts test-fixtures/pg-hn-input.json` exits 0
- Output: valid `WorkerResult` JSON (321 lines)
- Resolved: Paul Graham / Y Combinator / Hacker News
- Evidence: 28 items with provenance
- Email: 3 subject lines, full body + follow-up
- Quality gate: caught 1 overclaiming violation, auto-corrected
- `tsc --noEmit`: passes in both worker/ and root
