# Architecture review

Reviewed files:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/types.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/errors.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/schemas.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/agent.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/prompts.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/pipeline.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/index.ts`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-b/worker/src/cli.ts`

---

## Summary

The worker is well-structured for its scope. The separation of concerns across `agent.ts`, `pipeline.ts`, `prompts.ts`, `schemas.ts`, and `types.ts` is clean and appropriate for a 6-step LLM pipeline. The public API surface (`runDiligence`, three error classes, progress callback) is narrow and correctly typed.

The checker report (already resolved per `verification.md`) addressed the four largest spec compliance gaps. This review identifies additional architectural concerns that the checker's spec-compliance focus did not surface: specifically a Zod version mismatch that creates a silent runtime risk, a missing type guard at the CLI boundary, coupling between the quality gate and the draft step, and structural choices that will limit extensibility as the pipeline grows.

---

## Already covered by verification

The checker report and verification run addressed:

- **B1** — `_qualityWarnings` was missing from `WorkerResult`; now present (`worker/src/types.ts` line 94).
- **B2 / I1** — Step 2 using web tools in violation of spec B2; quality gate detail format mismatch; documented as resolved.
- **I2** — `safeProgress` was silently swallowing errors; `console.error` added (`pipeline.ts` lines 48-50).
- **I3** — `mention` array had no `.min(1)` constraint; now present (`schemas.ts` line 81).
- **I4** — `allowDangerouslySkipPermissions: true` was missing from `agent.ts`; now present (line 33).
- **N2** — `buildSynthesizePrompt` was unconditionally emitting the objections instruction; now conditionally gated on `job.focusAreas.includes("objections")` (`prompts.ts` line 199).
- TypeScript strict compilation: passes with zero errors.

---

## Net-new findings

### P0 (blockers)

**P0-1. Zod import path `"zod/v4"` does not match the installed package `"zod": "^3.25.0"`**

`worker/src/agent.ts` line 2 imports:
```typescript
import { z } from "zod/v4";
```

`worker/package.json` declares:
```json
"zod": "^3.25.0"
```

Zod 3.x does not export a `"zod/v4"` sub-path. The correct import for Zod 3 is `from "zod"`. The `"zod/v4"` sub-path only exists when the installed package is Zod 4 (package name still `"zod"` but semver `^4.x`).

`tsc --noEmit` passes because `skipLibCheck: true` suppresses deep type-checking of `node_modules`. At runtime, `node` will fail to resolve `"zod/v4"` and throw a `ERR_PACKAGE_PATH_NOT_EXPORTED` or `MODULE_NOT_FOUND` error on the very first query call. The entire worker is broken at runtime despite a clean lint.

`z.toJSONSchema()` is also a Zod 4 API. Zod 3 exposes this via a separate `zod-to-json-schema` package or `z.toJSON()` with different semantics.

Fix: Either (a) change `package.json` to `"zod": "^4.0.0"` and verify Zod 4 compatibility, or (b) change the import to `from "zod"` and replace `z.toJSONSchema()` with the Zod 3 equivalent (`import { zodToJsonSchema } from "zod-to-json-schema"`). Option (a) is preferred since the code is written against Zod 4's API surface.

Affected files:
- `worker/package.json` line 14
- `worker/src/agent.ts` line 2 and line 23 (`z.toJSONSchema`)
- `worker/src/schemas.ts` line 1 (also imports `from "zod/v4"`)

---

**P0-2. `stepDraft` does not emit `status: "running"` before returning from the quality gate re-run**

`pipeline.ts` `stepDraft` emits `{ stage: "draft", status: "running" }` at line 168, then returns. The quality gate re-run in `stepQualityGate` (line 207-217) re-invokes `runStep` and produces new outreach copy, but no progress event is emitted for this additional LLM call. The caller (`index.ts` line 62-69) receives a `status: "done"` event (line 224-228 of `pipeline.ts`) after a multi-second network round-trip with no intermediate notification.

The spec (B10) requires "each stage emits exactly two events: one with `status: 'running'` at the start and one with `status: 'done'` at the end." The re-run is explicitly exempt from additional stage events per spec B8: "the quality gate triggers a retry, which does not emit additional stage events." This is consistent with the spec's intent, but it means the frontend will show `draft: running` for an extended and unpredictable duration (both original draft + quality gate + re-draft), with no way for the caller to distinguish a simple draft from a retry.

This is a P0 from a UX-contract standpoint: the SSE stream the server forwards will show no activity for potentially 10+ seconds during a quality gate retry. The spec allows this, but it is an architectural decision that should be explicit. If the server SLA for a "no activity" window is short, this will cause premature timeout or user confusion.

Recommended resolution: Document the intentional "silent retry" behavior in a code comment at `stepQualityGate`. If the server has a keep-alive or timeout concern, a sub-event `{ stage: "draft", status: "running", detail: "quality gate: retrying draft" }` should be added (requires a spec amendment).

---

### P1 (important)

**P1-1. CLI input is cast with `as RequestInput` without runtime validation**

`worker/src/cli.ts` lines 16-18:
```typescript
const raw = readFileSync(inputPath, "utf-8");
input = JSON.parse(raw) as RequestInput;
```

`JSON.parse` returns `any`. The `as RequestInput` cast is not a type guard — TypeScript accepts it, but at runtime any malformed JSON (missing fields, wrong `tone` value, invalid `goalType`) will pass through and cause confusing errors deep inside `runStep`. Since `RequestInput` is the entry contract for the entire pipeline, it should be validated before use.

Fix: Add a Zod schema for `RequestInput` in `schemas.ts` (or a dedicated `requestInputSchema`) and parse the CLI input through it:
```typescript
const parsed = RequestInputSchema.safeParse(JSON.parse(raw));
if (!parsed.success) {
  console.error("Invalid input:", parsed.error.message);
  process.exit(1);
}
input = parsed.data;
```

This is P1 (not P0) because it only affects the CLI development path, not the server invocation path. The server is responsible for validating its own inputs before calling `runDiligence`.

---

**P1-2. `runStep` silently discards all non-`result` messages from the SDK iterator**

`agent.ts` lines 26-57: the `for await` loop over `query(...)` only acts on messages where `message.type === "result"`. All intermediate messages (tool call events, token stream events, system messages) are consumed and discarded. This is correct behavior for structured-output extraction, but it means:

1. No logging of tool calls (WebSearch/WebFetch calls) is possible at the `runStep` layer, making debugging live research failures opaque.
2. If the SDK changes its message protocol and emits a result in a different shape, the loop exhausts and falls through to the final `throw new AgentQueryError("Agent loop ended without a result message")` — which gives a generic error with no context about what the agent actually did.

Fix (observability): Add a debug-mode message logger in the `for await` body:
```typescript
if (process.env.WORKER_DEBUG && message.type !== "result") {
  console.error("[agent] message:", message.type, (message as any).subtype ?? "");
}
```
This costs nothing in production and makes tool-call traces visible during development.

Fix (safety net): Before the post-loop throw, log the last message type seen so it appears in the error.

---

**P1-3. The quality gate couples `stepQualityGate` to `stepDraft` implementation details**

`pipeline.ts` `stepQualityGate` (lines 182-231) accepts `job`, `target`, and `synthesis` solely so it can call `buildDraftPrompt` for the correction re-run (line 208). This means the quality gate function has an implicit dependency on the draft prompt builder that is not reflected in its signature semantics.

Architecturally, the quality gate's purpose is to audit and optionally correct. Embedding the re-draft logic inside the gate means:
- Adding a new draft format requires changing `stepQualityGate` as well as `stepDraft`.
- The retry path has no separate `onProgress` coverage (as noted in P0-2).
- Testing the gate in isolation requires constructing a full `ParsedJob`, `ResolvedTarget`, and `SynthesisResult` even when you only want to test violation detection.

Preferred refactor: Extract the correction re-run into a separate private function (`stepRedraft`) or return the violations from `stepQualityGate` and let the orchestrator in `pipeline.ts` / `index.ts` decide whether and how to re-draft. This decouples audit from correction and makes both independently testable.

---

**P1-4. `WorkerResult` type is defined in `types.ts` but partially reassembled in `index.ts` without a helper**

`index.ts` lines 73-90 manually constructs the `ResearchPacket` by pulling fields from three different intermediate objects (`target`, `synthesis`, `research`). This assembly logic is inline in the public entry point:

```typescript
const researchPacket: ResearchPacket = {
  person: target.person,
  organization: target.organization,
  surface: target.surface,
  summary: synthesis.summary,
  whyThisTarget: synthesis.whyThisTarget,
  contextCards: research.contextCards,
  recommendedAngle: synthesis.recommendedAngle,
  evidence: research.evidence,
};
```

If any intermediate type evolves (e.g., `SynthesisResult` gains a new field that maps to `ResearchPacket`), the connection is silently missed because `index.ts` will still compile — it only checks that the fields it does set satisfy the interface. A missing required field addition to `ResearchPacket` in `src/types.ts` will produce a TS error, but a newly required mapping from synthesis to packet will not.

Fix: Move this assembly into a named `assembleResearchPacket(target, synthesis, research): ResearchPacket` function in `pipeline.ts`. This makes the mapping explicit, testable, and co-located with the pipeline steps that produce the inputs.

---

### P2 (nice-to-have)

**P2-1. Error classes do not capture step context**

`errors.ts` defines three classes that extend `Error` with a `cause` field, but no step context. When `AgentQueryError` is thrown from step 3 vs step 5, the caller receives the same class with no structural way to identify which step failed. The `message` string carries this info informally.

For server-side error reporting (and future retry logic), knowing which step failed allows targeted recovery (e.g., retry only the research step, not the full pipeline). Consider adding a `step?: RunStageKey` field to `AgentQueryError`:
```typescript
constructor(message: string, options?: { cause?: unknown; step?: RunStageKey }) {
  super(message, { cause: options?.cause });
  this.step = options?.step ?? undefined;
}
```

---

**P2-2. `ALL_FOCUSES` constant is defined in `pipeline.ts` but applies to a domain rule**

`pipeline.ts` line 37-43 defines:
```typescript
const ALL_FOCUSES: ResearchFocus[] = [
  "person_background",
  "service_surface",
  "investment_thesis",
  "recent_signals",
  "objections",
];
```

This mirrors the `ResearchFocus` union in `types.ts`. If a new focus area is added to the type, `ALL_FOCUSES` must be updated manually and there is no compiler warning. Place this constant in `types.ts` and derive it from the type (or use a Zod enum's `.options` property if `ResearchFocus` is expressed as a Zod enum):
```typescript
// In types.ts
export const ALL_RESEARCH_FOCUSES: ResearchFocus[] = [
  "person_background",
  "service_surface",
  "investment_thesis",
  "recent_signals",
  "objections",
] as const satisfies ResearchFocus[];
```

---

**P2-3. Evidence produced by steps 1, 2, and 4 is not collected**

The spec (B9) requires: "`ResearchPacket.evidence` contains at least one `EvidenceItem` per stage that produced claims (minimum 3 items total for a typical run)." The current implementation collects evidence only from step 3 (research). Steps 1 (parse), 2 (resolve), and 4 (synthesize) produce factual claims (e.g., the resolved `person`, the synthesis `headline`) but contribute no `EvidenceItem` records.

For a "person_background + service_surface + objections" focus run (as in the PG/HN fixture), step 3 alone will produce more than 3 items, so the minimum count will be met. However, claims made in the synthesis (`recommendedAngle.headline`, `whyThisTarget`) have no evidence anchor from steps that generated them — only from step 3's evidence pool, which is passed to the quality gate indirectly.

This is P2 because the minimum count spec criterion is met in practice, but the provenance model is incomplete for synthesis-stage claims. A future iteration should collect evidence from `stepResolve` (with `sourceType: "Public web"` or `"Inference"`) and from `stepSynthesize` (with `sourceType: "Inference"`).

---

**P2-4. `buildQualityGatePrompt` does not pass `title`, `summary`, or `followUp` fields of all deliverables for full audit coverage**

`prompts.ts` lines 239-261: the quality gate prompt passes `body` and `followUp` for email and DMs, but does not include `title` or `summary` of each deliverable. Fake familiarity or overclaiming patterns can appear in the `title` or `summary` fields and will not be caught by the gate.

Extend the prompt to include all fields of each deliverable.

---

**P2-5. No validation that `SynthesisResultSchema.whyThisTarget` has at least one item**

`schemas.ts` line 88-89:
```typescript
whyThisTarget: z
  .array(z.string())
  .max(3)
```

The spec says "1 to 3 non-empty strings." The schema enforces `.max(3)` but not `.min(1)`. An empty array is schema-valid. `pipeline.ts` truncates to 3 but does not check for zero. Add `.min(1)` to match the spec's lower bound, consistent with the already-present `.min(1)` on `mention`.

---

## Why verification did not catch net-new findings

The checker report and verification run performed spec compliance checking against acceptance criteria (B1–B10) and TypeScript compilation. The four findings above that are net-new were not caught for these reasons:

- **P0-1 (Zod version mismatch)**: `tsc --noEmit` with `skipLibCheck: true` does not validate import sub-paths against the installed package's `package.json` `exports` map. The Zod `"zod/v4"` path resolves at the TypeScript type level because the Zod package ships type declarations for its v4 sub-path even when the installed semver is 3.x. Runtime behavior is only observable by actually executing `import "zod/v4"` in Node.js.

- **P0-2 (silent draft retry)**: The spec explicitly permits no additional stage events during a quality gate retry (B10). Compliance checking naturally accepted this as correct. The UX-contract implication (extended silent period during SSE streaming) is an architectural concern, not a spec violation.

- **P1-1 (CLI unsafe cast)**: The checker report's N-class findings did not extend to the CLI harness's input handling. The CLI is a developer tool, not the primary API surface, and the checker focused on the `runDiligence` contract.

- **P1-2 (discarded SDK messages)**: The checker verified that `result` messages are handled and that `AgentQueryError` is thrown on exhaustion. Whether intermediate messages are logged is a developer observability concern that spec compliance checking does not address.

- **P1-3 (quality gate coupling)**: The checker identified the functional outputs of the quality gate (violations, re-run, warnings) but evaluated them against spec outcomes. The internal coupling between `stepQualityGate` and `buildDraftPrompt` is an architecture concern, not a spec compliance gap.

- **P1-4, P2-x**: These are maintainability and future-proofing concerns outside the scope of spec acceptance criteria.

---

## Suggested refactors

In priority order:

1. **Fix the Zod version mismatch immediately.** Change `package.json` to `"zod": "^4.0.0"` (or `"^4"`) to match the API used in `agent.ts` and `schemas.ts`. Run `npm install` and re-lint. This is a correctness blocker.

2. **Decouple the quality gate from draft internals.** Refactor `stepQualityGate` to return `QualityGateResult` only (audit responsibility), and move the correction re-run into the `index.ts` orchestrator or a separate `stepRedraft` function in `pipeline.ts`. Signature becomes:
   ```typescript
   export async function stepQualityGate(
     outreach: OutreachPacket,
     evidence: EvidenceItem[]
   ): Promise<QualityGateResult>
   ```
   The orchestrator then decides whether to call `stepRedraft`.

3. **Add a `RequestInputSchema` in `schemas.ts` and use it in `cli.ts`.** Validates the CLI entry point at runtime, not just at compile time.

4. **Add `assembleResearchPacket` helper to `pipeline.ts`.** Move the inline assembly from `index.ts` into a named, testable function.

5. **Add `.min(1)` to `whyThisTarget` in `SynthesisResultSchema`.** One-line fix, closes the spec gap.

6. **Add `ALL_RESEARCH_FOCUSES` to `types.ts` and remove the duplicate from `pipeline.ts`.** Eliminates the risk of the constant going stale when the union type is extended.

7. **Extend `buildQualityGatePrompt` to include all deliverable fields.** Prevents title/summary violations from bypassing the audit.
