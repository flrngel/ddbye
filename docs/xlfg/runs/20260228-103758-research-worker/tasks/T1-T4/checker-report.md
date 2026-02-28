# Checker Report

## Verdict: REVISE

---

## Findings

### Blockers

**B1. `_qualityWarnings` is not attached to the returned object (spec B8)**

The spec requires: "the field `_qualityWarnings: string[]` is attached to the returned object (outside the typed packets) for server-side logging."

- `WorkerResult` in `worker/src/types.ts` does not include `_qualityWarnings`.
- `runDiligence` in `worker/src/index.ts` calls `stepQualityGate`, receives `gateResult.qualityWarnings`, then discards it entirely — only `gateResult.outreach` is used.
- The server-side logging contract is broken: callers cannot observe quality warnings.

Affected files:
- `worker/src/types.ts` lines 91-94 (`WorkerResult` interface)
- `worker/src/index.ts` lines 70, 84-87 (return statement discards `qualityWarnings`)

Fix: Add `_qualityWarnings?: string[]` to `WorkerResult`. In `runDiligence`, attach it conditionally:
```typescript
return {
  research: researchPacket,
  outreach,
  ...(gateResult.qualityWarnings.length > 0
    ? { _qualityWarnings: gateResult.qualityWarnings }
    : {}),
};
```

---

**B2. Step 2 (resolve) uses web tools in violation of spec B2**

Spec B2 says: "Steps that do not need web tools (steps 1, 2, 4, 6) do not include web tools in `allowedTools`."

`pipeline.ts` line 89 passes `allowedTools: ["WebSearch", "WebFetch"]` to `stepResolve`.

Note: This contradicts B4's implicit requirement that the model resolve "Hacker News specifically" — which benefits from web lookup. The spec is internally inconsistent here. However, the letter of B2 is violated.

Fix: Remove web tools from `stepResolve` OR document this deviation and propose a spec correction to allow web tools in step 2. The recommended path is to allow step 2 web access and update spec B2 to say "steps 1, 4, 6" rather than "steps 1, 2, 4, 6", since step 2 explicitly needs web search to correctly resolve surfaces (evidenced by B4's PG/HN acceptance criterion).

---

### Important

**I1. Quality gate progress event detail format does not match spec**

Spec B8 says the done event when violations remain should have detail: `"quality gate: N warnings"`.

`pipeline.ts` line 227 emits: `"Quality gate: N warning(s) found, draft corrected"`.

This is a case mismatch and format mismatch. The server forwarding this event to the frontend for display will diverge from the expected format.

Fix in `worker/src/pipeline.ts` line 224-228:
```typescript
safeProgress(onProgress, {
  stage: "draft",
  status: "done",
  detail: `quality gate: ${warnings.length} warnings`,
});
```

---

**I2. `onProgress` errors are silently swallowed without logging (spec B10)**

Spec B10 says: "If `onProgress` throws, the error is caught and logged but does not abort the pipeline."

`safeProgress` in `pipeline.ts` lines 45-51 catches the error but does nothing with it — no `console.error` or equivalent.

Fix:
```typescript
function safeProgress(onProgress: OnProgress, ...args: Parameters<OnProgress>): void {
  try {
    onProgress(...args);
  } catch (err) {
    console.error("[worker] onProgress callback threw:", err);
  }
}
```

---

**I3. `recommendedAngle.mention` empty array not validated or re-prompted**

The spec says: "If `recommendedAngle.mention` is empty, quality gate must flag this as an unsupported assertion; step 4 re-prompt is triggered."

The current implementation has no `.min(1)` constraint on the `mention` array in `SynthesisResultSchema` (`schemas.ts` line 80-82), no code check after `stepSynthesize`, and no re-prompt path for step 4. The quality gate only re-runs step 5 (draft), not step 4 (synthesize).

This edge case is unhandled. In practice an empty `mention` array will cause the draft to lack a concrete angle and silently pass the quality gate.

Fix: Add `.min(1)` to the `mention` field in `SynthesisResultSchema` to force schema-level rejection, which will surface as an `AgentQueryError` and make the failure visible. A step-4 re-prompt path is a more complete fix but requires more implementation.

---

**I4. `bypassPermissions` mode is used without `allowDangerouslySkipPermissions: true`**

The SDK's `Options` type (`runtimeTypes.d.ts` line 431) documents: "Must be set to `true` when using `permissionMode: 'bypassPermissions'`."

`agent.ts` line 31 sets `permissionMode: "bypassPermissions"` but does not set `allowDangerouslySkipPermissions: true`. TypeScript does not catch this because both fields are optional, but at runtime the SDK may reject or warn on this configuration.

Fix in `worker/src/agent.ts` line 30-35:
```typescript
permissionMode: "bypassPermissions",
allowDangerouslySkipPermissions: true,
```

---

### Nice-to-have

**N1. Evidence ID format is only enforced for step 3 by prompt instruction**

Spec says: "Assign ids as `ev_<stepIndex>_<itemIndex>` to guarantee uniqueness within a run."

The prompt in `buildResearchPrompt` (`prompts.ts` line 172) tells the model to use `"ev_3_N"` format but this is purely a prompt instruction. There is no code-level enforcement or post-processing validation that IDs are unique or match the format. A Zod `.regex(/^ev_\d+_\d+$/)` constraint on the `id` field in `EvidenceItemSchema` would enforce this.

---

**N2. `buildSynthesizePrompt` always emits the objections instruction even when `objections` is not in focus areas**

`prompts.ts` line 199: "If 'objections' was a focus area, avoid[] must include at least one objection-derived entry."

This instruction is hardcoded into every synthesize prompt regardless of the actual focus areas in `job.focusAreas`. When `objections` was not researched, the model may hallucinate an objection-based avoid entry to comply with the instruction.

Fix: Dynamically include the instruction only when `job.focusAreas.includes("objections")`:
```typescript
${job.focusAreas.includes("objections")
  ? 'Since "objections" was a focus area, avoid[] must include at least one objection-derived entry.'
  : ''}
```

---

**N3. `README.md` still says "Worker placeholder — no worker code intentionally included"**

The README (`worker/README.md`) is the original placeholder and has not been updated to reflect the implemented module. This is not a spec requirement but is misleading for developers.

---

**N4. `.gitignore` modified outside the `worker/` scope**

The spec says "No modifications to `src/`, `server/`, `tests/`, root config files, or `index.html`." The `.gitignore` was modified (adding `.xlfg/`). This is a tooling artifact and is not harmful, but it does technically violate the scope restriction on root config files.

---

## Required changes before accept

1. **Add `_qualityWarnings?: string[]` to `WorkerResult` in `worker/src/types.ts` and attach it in `runDiligence` in `worker/src/index.ts`.** (Blocker B1)

2. **Resolve the step 2 / web tools contradiction.** Either: (a) remove `WebSearch`/`WebFetch` from `stepResolve` to comply with spec B2 literally, accepting that the model will resolve targets from training knowledge only; or (b) propose a spec amendment to allow web tools in step 2, since B4 effectively requires it. Document the chosen path in the implementer report. (Blocker B2)

3. **Fix `onProgress` error logging in `safeProgress` in `worker/src/pipeline.ts`.** Add a `console.error` call in the catch block. (Important I2)

4. **Fix quality gate done event detail to match spec format**: `"quality gate: N warnings"` not `"Quality gate: N warning(s) found, draft corrected"`. (Important I1)

5. **Add `allowDangerouslySkipPermissions: true` to `agent.ts` `query` options.** (Important I4)

---

## Verification notes

- `tsc --noEmit` passes cleanly from `worker/` — no type errors.
- All 11 expected files are present.
- `WorkerResult`, `ResearchPacket`, `OutreachPacket`, and `EvidenceItem` types in `worker/src/types.ts` match `src/types.ts` exactly.
- All 5 prohibited patterns are enumerated in `QUALITY_GATE_SYSTEM_PROMPT` (`prompts.ts` lines 93-119).
- One-retry-maximum is correctly enforced in `stepQualityGate` (`pipeline.ts` lines 207-230).
- `safeProgress` wrapper correctly prevents callback errors from aborting the pipeline.
- `validateApiKey()` is called at the top of `runDiligence` before any network call (`index.ts` line 44).
- `UnresolvableTargetError` is thrown when `surface` is empty before draft step (`pipeline.ts` lines 92-96), enforcing the safety gate.
- `whyThisTarget` is both schema-constrained (`max(3)`) and code-truncated — double-guarded correctly.
- Evidence IDs use `ev_3_N` format in research step only; other steps produce no evidence items (reasonable scope).
- `web_search`/`web_fetch` tool names used in `allowedTools` match the SDK's `WebSearch`/`WebFetch` naming (verified in `sdk-tools.d.ts`).
- CLI harness (`cli.ts`) is complete and matches the plan's verification command `npx tsx worker/src/cli.ts worker/test-fixtures/pg-hn-input.json`.
- Test fixture (`test-fixtures/pg-hn-input.json`) contains the PG/HN Korean brief matching spec B4's acceptance criterion.
