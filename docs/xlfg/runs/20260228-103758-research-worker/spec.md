# Spec: Research Worker (Track B)

## Problem

The frontend simulation (`src/logic/mockAgent.ts`) pattern-matches brief text against two hard-coded seeded cases. It cannot handle novel targets, does no real web research, and produces no evidence provenance. The product's core value proposition — "messy brief → due-diligence research → outreach" — is only theatre until a real worker replaces the simulation.

Track B delivers that worker: a standalone TypeScript module that runs the full 6-step pipeline using the Claude Agent SDK with live WebSearch and WebFetch tools.

---

## Goals

1. Implement `runDiligence(input, onProgress)` in a self-contained `worker/` package.
2. Execute the 6-step pipeline (parse → resolve → research → synthesize → draft → quality gate) using real agent calls.
3. Return output that exactly matches `ResearchPacket` and `OutreachPacket` from `src/types.ts`.
4. Emit typed progress events at each stage transition so the server (Track A) can stream them via SSE.
5. Enforce provenance on every `EvidenceItem` (`"User brief"` | `"Public web"` | `"Inference"`).
6. Enforce safety rules from `docs/04_agent-plan-claude-sdk.md` at the quality gate and throughout prompt construction.

---

## Non-goals

- No modifications to `src/`, `server/`, `tests/`, root config files, or `index.html`.
- No UI or frontend changes — the worker is consumed by the server layer only.
- No custom web-browsing stack; only Claude server tools (`web_search`, `web_fetch`) are used.
- No caching layer in this iteration — every call to `runDiligence` makes fresh agent requests.
- No authentication or rate-limit handling beyond failing with a typed error.
- No support for streaming individual token output — only stage-level progress events are emitted.

---

## User stories

**As a server** (Track A), I call `runDiligence(input, onProgress)` and receive a completed `{ research: ResearchPacket, outreach: OutreachPacket }` when the pipeline finishes, or a thrown error if it cannot complete. I forward each `onProgress` event to the client via SSE so the user sees live stage updates.

**As a developer** testing the worker in isolation, I can run `worker/src/cli.ts` with a JSON input file and see the full output printed to stdout, with progress events printed to stderr.

**As a product reviewer**, I can inspect any `EvidenceItem` in the returned `ResearchPacket` and verify which claims came from the user's brief, which came from live web research, and which are model inferences — because every item carries a `sourceType` label.

---

## Acceptance criteria

### Package setup (B1)

- [ ] `worker/package.json` exists, declares `name: "@outreachos/worker"`, sets `"type": "module"`, and lists `@anthropic-ai/agent-sdk` as a dependency.
- [ ] `worker/tsconfig.json` extends strict TypeScript mode (matches or is stricter than root `tsconfig.json`).
- [ ] `npm run build` inside `worker/` compiles without errors.

### Agent scaffold (B2)

- [ ] A single exported entry point `worker/src/index.ts` exposes `runDiligence`.
- [ ] The SDK client is initialized inside `runDiligence` using `process.env.ANTHROPIC_API_KEY`; if the key is absent the function throws `WorkerConfigError` before making any network call.
- [ ] `web_search` and `web_fetch` are passed as `allowedTools` on every `query()` call that performs research (steps 3 and 5).
- [ ] Steps that do not need web tools (steps 1, 2, 4, 6) do not include web tools in `allowedTools`.

### Step 1 — Parse intake (B3)

- [ ] Given a `RequestInput`, the worker produces an internal structured job object with at minimum: `targetHypothesis`, `senderObjective`, `senderOffer`, `preferredChannel`, `tone`, `goalType`, `focuses`.
- [ ] The `targetBrief` field is passed verbatim to the parse prompt — no truncation, no normalization.
- [ ] `onProgress` is called with `{ stage: "parse", status: "running", detail: "..." }` before the query and `{ stage: "parse", status: "done", detail: "..." }` after.
- [ ] Brief text containing non-English characters (e.g., Korean) is handled without error.

### Step 2 — Resolve target (B4)

- [ ] The worker produces a resolved target with `person`, `organization`, and `surface` string fields.
- [ ] Given the PG/Hacker News brief (`"PG, famous for YC — want to explore doing business with Hacker News…"`), the resolved `surface` must reference Hacker News specifically, not YC or Y Combinator broadly.
- [ ] If the agent cannot determine any of the three fields with reasonable confidence, it sets the field to `""` (empty string) rather than hallucinating a name.
- [ ] Copy generation (steps 5 and 6) must not begin until this step completes with a non-empty `surface`. If `surface` remains empty after resolve, `runDiligence` throws `UnresolvableTargetError`.
- [ ] `onProgress` is called with `{ stage: "resolve", status: "running" }` before and `{ stage: "resolve", status: "done" }` after.

### Step 3 — Expand context (B5)

- [ ] WebSearch and WebFetch are used to gather evidence for only the focus areas listed in `input.focuses`.
- [ ] Output includes at least one `ResearchCard` per requested focus area (title, body, bullets[]).
- [ ] Every fact placed in a `ResearchCard` that came from a web result is recorded as an `EvidenceItem` with `sourceType: "Public web"`.
- [ ] Facts derived directly from `input.targetBrief` or `input.objective` are recorded with `sourceType: "User brief"`.
- [ ] Claims that are model inferences not backed by a specific source are recorded with `sourceType: "Inference"` and `confidence: "Medium"`.
- [ ] `onProgress` is called with `{ stage: "research", status: "running" }` and `{ stage: "research", status: "done" }`.

### Step 4 — Synthesize wedge (B6)

- [ ] Returns a `recommendedAngle` object matching the type: `{ headline: string, rationale: string, mention: string[], avoid: string[] }`.
- [ ] Returns `whyThisTarget` as an array of 1 to 3 non-empty strings.
- [ ] The `headline` must be grounded in at least one evidence item from step 3; the prompt must explicitly require this.
- [ ] The `avoid[]` array must include at minimum one entry derived from the `objections` focus area when that focus is present in `input.focuses`.
- [ ] `onProgress` is called with `{ stage: "synthesize", status: "running" }` and `{ stage: "synthesize", status: "done" }`.

### Step 5 — Generate outreach (B7)

- [ ] Returns an `OutreachPacket` with all three deliverables populated: `email`, `linkedin`, `x_dm`.
- [ ] `email.subjects` is a non-empty array of 2 to 3 distinct subject line strings.
- [ ] Each deliverable has non-empty `title`, `summary`, `body`, and `followUp` fields.
- [ ] The `body` of each deliverable references at least one item from `recommendedAngle.mention`.
- [ ] No deliverable body contains any item listed in `recommendedAngle.avoid`.
- [ ] Tone respects `input.tone` (`"respectful"` | `"direct"` | `"warm"`).
- [ ] Goal type respects `input.goalType` (`"sell"` | `"partnership"` | `"fundraise"` | `"hire"` | `"advice"`).
- [ ] The CTA in each deliverable is lightweight — it asks for a small next step, not a meeting or immediate commitment.
- [ ] `onProgress` is called with `{ stage: "draft", status: "running" }` and `{ stage: "draft", status: "done" }`.

### Step 6 — Quality gate (B8)

- [ ] The quality gate prompt checks for all five prohibited patterns: overclaiming, fake familiarity, target insults, unsupported assertions, evidence-copy mismatch.
- [ ] If one or more violations are found, the worker re-runs step 5 once with a correction prompt that lists the violations explicitly.
- [ ] The re-run result is returned without a second quality gate pass (one retry maximum).
- [ ] If the re-run still contains violations, the worker logs the violations and returns the best available output rather than throwing — the field `_qualityWarnings: string[]` is attached to the returned object (outside the typed packets) for server-side logging.
- [ ] A known bad pattern ("I've been following your work closely for years") injected into the draft must be caught and flagged as fake familiarity.
- [ ] `onProgress` is called with `{ stage: "draft", status: "done", detail: "quality gate passed" }` on clean output, or `{ stage: "draft", status: "done", detail: "quality gate: N warnings" }` when warnings remain.

### Structured output (B9)

- [ ] The function return type is `Promise<{ research: ResearchPacket; outreach: OutreachPacket }>`.
- [ ] Every field in `ResearchPacket` is non-null and matches the type definition in `src/types.ts`.
- [ ] Every field in `OutreachPacket` is non-null and matches the type definition in `src/types.ts`.
- [ ] `ResearchPacket.evidence` contains at least one `EvidenceItem` per stage that produced claims (minimum 3 items total for a typical run).
- [ ] Every `EvidenceItem` satisfies: `id` is a unique non-empty string, `claim` is non-empty, `sourceType` is one of the three valid values, `sourceLabel` is non-empty, `confidence` is `"High"` or `"Medium"`, `usedFor` is non-empty.
- [ ] The worker's internal types mirror `src/types.ts` exactly (copied, not imported) to avoid cross-package coupling.

### Progress callback (B10)

- [ ] `onProgress` is typed as `(event: ProgressEvent) => void` where `ProgressEvent` is `{ stage: RunStageKey; status: "running" | "done"; detail?: string }` and `RunStageKey` is `"parse" | "resolve" | "research" | "synthesize" | "draft"`.
- [ ] Each stage emits exactly two events: one with `status: "running"` at the start and one with `status: "done"` at the end (except when the quality gate triggers a retry, which does not emit additional stage events).
- [ ] If `onProgress` throws, the error is caught and logged but does not abort the pipeline.

---

## API surface

### Entry point

```typescript
// worker/src/index.ts

export type RunStageKey = "parse" | "resolve" | "research" | "synthesize" | "draft";

export interface ProgressEvent {
  stage: RunStageKey;
  status: "running" | "done";
  detail?: string;
}

export type OnProgress = (event: ProgressEvent) => void;

export interface WorkerResult {
  research: ResearchPacket;
  outreach: OutreachPacket;
}

export async function runDiligence(
  input: RequestInput,
  onProgress: OnProgress
): Promise<WorkerResult>
```

### Errors thrown

| Error class | When |
|---|---|
| `WorkerConfigError` | `ANTHROPIC_API_KEY` is missing or empty at call time |
| `UnresolvableTargetError` | Step 2 returns an empty `surface` after the agent query |
| `AgentQueryError` | The SDK throws or returns a non-retryable error on any step |

All error classes extend `Error` and carry a `cause` field for the original thrown value.

---

## Type contracts

All types below are mirrored verbatim from `src/types.ts` into `worker/src/types.ts`. The worker must not import from `src/`.

```typescript
// Canonical source: src/types.ts (read-only for Track B)

interface RequestInput {
  targetBrief: string;       // raw, potentially multilingual brief text
  objective: string;
  offer: string;
  preferredChannel: Channel; // "email" | "linkedin" | "x_dm"
  tone: Tone;                // "respectful" | "direct" | "warm"
  goalType: GoalType;        // "sell" | "partnership" | "fundraise" | "hire" | "advice"
  focuses: ResearchFocus[];  // subset of 5 focus area keys
}

interface ResearchPacket {
  person: string;
  organization: string;
  surface: string;           // the narrow, pitchable surface — not the parent org
  summary: string;
  whyThisTarget: string[];   // 1–3 bullets
  contextCards: ResearchCard[];
  recommendedAngle: {
    headline: string;
    rationale: string;
    mention: string[];
    avoid: string[];
  };
  evidence: EvidenceItem[];
}

interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: "Public web" | "User brief" | "Inference";
  sourceLabel: string;
  confidence: "High" | "Medium";
  usedFor: string;
}

interface OutreachPacket {
  email: Deliverable;        // includes subjects: string[]
  linkedin: Deliverable;
  x_dm: Deliverable;
}

interface Deliverable {
  title: string;
  summary: string;
  subjects?: string[];       // required for email, omitted for DMs
  body: string;
  followUp: string;
}
```

---

## Safety rules

These rules are enforcement requirements, not suggestions. Each prompt in the pipeline must encode the relevant rules directly in the system/user message.

| Rule | Enforced at |
|---|---|
| Never treat a fuzzy brief as proof | Step 2 (resolve) system prompt |
| Never pitch the wrong entity if the surface is narrower than the organization | Step 2 (resolve) system prompt; quality gate |
| Never write copy before the surface is resolved | Code gate: step 5 must not be called if `surface === ""` |
| Never let the draft sound like generic AI flattery | Step 5 (draft) system prompt; quality gate |
| Prefer a lightweight CTA on first contact | Step 5 (draft) system prompt |

The quality gate prompt (step 6) must explicitly list all five prohibited patterns and instruct the model to output a structured verdict (e.g., `{ violations: Array<{ pattern: string, excerpt: string }> }`).

---

## UX notes

The worker has no direct UI. Its `onProgress` events are forwarded by the server to the frontend via SSE. The frontend maps `RunStageKey` values to the `RunStage[]` display model in `AppContext`. Stage keys emitted by the worker must exactly match the `key` values defined in the `RunStage` type (`"parse" | "resolve" | "research" | "synthesize" | "draft"`).

---

## Edge cases

| Scenario | Expected behavior |
|---|---|
| `targetBrief` contains only Korean text | Step 1 and step 2 must not error; the model handles multilingual input natively |
| `focuses` array is empty | Step 3 defaults to all five focus areas rather than producing empty `contextCards` |
| `preferredChannel` is `"x_dm"` | `x_dm.body` is <= 280 characters; the prompt must enforce this constraint |
| The agent query times out (SDK throws) | Wrap in `AgentQueryError` and re-throw; do not retry automatically |
| `surface` resolves to an org name identical to `organization` | Acceptable; log a warning but do not block; the quality gate will catch pitch misalignment if it occurs |
| `recommendedAngle.mention` is empty | Quality gate must flag this as an unsupported assertion; step 4 re-prompt is triggered |
| `whyThisTarget` returns more than 3 items | Truncate to the first 3 before returning; do not re-query |
| Evidence `id` collision | Assign ids as `ev_<stepIndex>_<itemIndex>` to guarantee uniqueness within a run |
| Quality gate re-run still has violations | Return output with `_qualityWarnings` attached; do not loop infinitely |
| `ANTHROPIC_API_KEY` is present but invalid | SDK throws on first `query()` call; wrap as `AgentQueryError` |

---

## Security / privacy / compliance

- `ANTHROPIC_API_KEY` must only be read from `process.env`. It must never be logged, included in error messages, or embedded in prompts.
- The `targetBrief`, `objective`, and `offer` fields are user-supplied and may contain PII (names, contact details). These fields are sent verbatim to the Anthropic API as part of the prompt. The worker must not log these fields at INFO level or above; debug-level logging is acceptable in non-production builds only.
- The worker does not persist any data. Output is returned in memory to the caller (server layer). Persistence is the server's responsibility.
- Web search and fetch results are fetched by Anthropic's servers, not the worker host. No custom proxy or credentials are added to web tool calls.
- The worker must not include any user-supplied text directly in `web_search` queries without sanitization review — the parse step must extract a structured search intent rather than passing raw brief text to the search tool.

---

## Open questions

1. **SDK `query()` concurrency** — Can steps 1 and 2 be parallelized, or does the SDK require sequential calls per session? Assumption: sequential per the current SDK design; revisit if the SDK adds concurrent query support.

2. **X DM character limit** — The 280-character constraint for `x_dm.body` is enforced via prompt instruction. If the model routinely exceeds this, a post-processing truncation step may be needed. Assumption: prompt instruction is sufficient for the prototype.

3. **Worker invocation model** — The context assumes the worker is called by the server (Track A) as a function import. If Track A and Track B use separate runtimes, the interface becomes an HTTP call or subprocess. Assumption: same Node.js process for now; a subprocess boundary can be added later without changing this spec.

4. **Quality gate loop limit** — Specced as one retry. If product testing reveals one retry is insufficient for certain edge cases, the limit can be raised to two with a matching acceptance criterion update.

5. **Focus area defaulting** — If `focuses` is empty, the worker defaults to all five areas. This is an assumption; the product may prefer to error instead. To be confirmed with product.
