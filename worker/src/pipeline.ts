import { runStep } from "./agent.js";
import { UnresolvableTargetError } from "./errors.js";
import {
  ParsedJobSchema,
  ResolvedTargetSchema,
  ResearchContextSchema,
  SynthesisResultSchema,
  OutreachPacketSchema,
  QualityGateResultSchema,
} from "./schemas.js";
import {
  PARSE_SYSTEM_PROMPT,
  RESOLVE_SYSTEM_PROMPT,
  RESEARCH_SYSTEM_PROMPT,
  SYNTHESIZE_SYSTEM_PROMPT,
  DRAFT_SYSTEM_PROMPT,
  QUALITY_GATE_SYSTEM_PROMPT,
  buildParsePrompt,
  buildResolvePrompt,
  buildResearchPrompt,
  buildSynthesizePrompt,
  buildDraftPrompt,
  buildQualityGatePrompt,
} from "./prompts.js";
import type {
  RequestInput,
  ParsedJob,
  ResolvedTarget,
  ResearchContext,
  SynthesisResult,
  OutreachPacket,
  QualityGateResult,
  OnProgress,
  ResearchFocus,
} from "./types.js";

const ALL_FOCUSES: ResearchFocus[] = [
  "person_background",
  "service_surface",
  "investment_thesis",
  "recent_signals",
  "objections",
];

function safeProgress(onProgress: OnProgress, ...args: Parameters<OnProgress>): void {
  try {
    onProgress(...args);
  } catch (err) {
    console.error("[worker] onProgress callback threw:", err);
  }
}

// --- Step 1: Parse ---

export async function stepParse(
  input: RequestInput,
  onProgress: OnProgress
): Promise<ParsedJob> {
  safeProgress(onProgress, { stage: "parse", status: "running", detail: "Parsing intake form" });

  const result = await runStep<ParsedJob>({
    prompt: buildParsePrompt(input),
    systemPrompt: PARSE_SYSTEM_PROMPT,
    schema: ParsedJobSchema,
    tools: [],
  });

  // Default empty focuses to all
  if (result.focusAreas.length === 0) {
    result.focusAreas = [...ALL_FOCUSES];
  }

  safeProgress(onProgress, { stage: "parse", status: "done", detail: "Intake parsed" });
  return result;
}

// --- Step 2: Resolve ---

export async function stepResolve(
  job: ParsedJob,
  onProgress: OnProgress
): Promise<ResolvedTarget> {
  safeProgress(onProgress, { stage: "resolve", status: "running", detail: "Resolving target identity" });

  const result = await runStep<ResolvedTarget>({
    prompt: buildResolvePrompt(job),
    systemPrompt: RESOLVE_SYSTEM_PROMPT,
    schema: ResolvedTargetSchema,
    tools: ["WebSearch", "WebFetch"],
  });

  if (!result.surface) {
    throw new UnresolvableTargetError(
      `Could not resolve a pitchable surface for target: person="${result.person}", org="${result.organization}"`
    );
  }

  safeProgress(onProgress, {
    stage: "resolve",
    status: "done",
    detail: `Resolved: surface=${result.surface}`,
  });
  return result;
}

// --- Step 3: Research ---

export async function stepResearch(
  job: ParsedJob,
  target: ResolvedTarget,
  onProgress: OnProgress
): Promise<ResearchContext> {
  safeProgress(onProgress, {
    stage: "research",
    status: "running",
    detail: `Researching ${job.focusAreas.join(", ")}`,
  });

  const result = await runStep<ResearchContext>({
    prompt: buildResearchPrompt(job, target),
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    schema: ResearchContextSchema,
    tools: ["WebSearch", "WebFetch"],
  });

  safeProgress(onProgress, {
    stage: "research",
    status: "done",
    detail: `Found ${result.contextCards.length} cards, ${result.evidence.length} evidence items`,
  });
  return result;
}

// --- Step 4: Synthesize ---

export async function stepSynthesize(
  job: ParsedJob,
  target: ResolvedTarget,
  research: ResearchContext,
  onProgress: OnProgress
): Promise<SynthesisResult> {
  safeProgress(onProgress, { stage: "synthesize", status: "running", detail: "Synthesizing outreach angle" });

  const result = await runStep<SynthesisResult>({
    prompt: buildSynthesizePrompt(job, target, research),
    systemPrompt: SYNTHESIZE_SYSTEM_PROMPT,
    schema: SynthesisResultSchema,
    tools: [],
  });

  // Truncate whyThisTarget to max 3
  if (result.whyThisTarget.length > 3) {
    result.whyThisTarget = result.whyThisTarget.slice(0, 3);
  }

  safeProgress(onProgress, { stage: "synthesize", status: "done", detail: `Angle: ${result.recommendedAngle.headline}` });
  return result;
}

// --- Step 5: Draft ---

export async function stepDraft(
  job: ParsedJob,
  target: ResolvedTarget,
  synthesis: SynthesisResult,
  onProgress: OnProgress
): Promise<OutreachPacket> {
  safeProgress(onProgress, { stage: "draft", status: "running", detail: "Drafting outreach copy" });

  const result = await runStep<OutreachPacket>({
    prompt: buildDraftPrompt(job, target, synthesis),
    systemPrompt: DRAFT_SYSTEM_PROMPT,
    schema: OutreachPacketSchema,
    tools: [],
  });

  return result;
}

// --- Step 6: Quality Gate ---

export async function stepQualityGate(
  outreach: OutreachPacket,
  evidence: { id: string; claim: string; sourceType: string }[],
  job: ParsedJob,
  target: ResolvedTarget,
  synthesis: SynthesisResult,
  onProgress: OnProgress
): Promise<{ outreach: OutreachPacket; qualityWarnings: string[] }> {
  const gateResult = await runStep<QualityGateResult>({
    prompt: buildQualityGatePrompt(outreach, evidence),
    systemPrompt: QUALITY_GATE_SYSTEM_PROMPT,
    schema: QualityGateResultSchema,
    tools: [],
  });

  if (gateResult.passed) {
    safeProgress(onProgress, { stage: "draft", status: "done", detail: "Quality gate passed" });
    return { outreach, qualityWarnings: [] };
  }

  // Re-run draft once with corrections
  const violationList = gateResult.violations
    .map((v) => `- ${v.pattern}: "${v.excerpt}"`)
    .join("\n");

  const correctedOutreach = await runStep<OutreachPacket>({
    prompt: `${buildDraftPrompt(job, target, synthesis)}

CORRECTIONS REQUIRED — the previous draft had these quality violations:
${violationList}

Fix ALL of the above violations in this new draft. Do not introduce new violations.`,
    systemPrompt: DRAFT_SYSTEM_PROMPT,
    schema: OutreachPacketSchema,
    tools: [],
  });

  // One retry maximum — do not loop
  const warnings = gateResult.violations.map(
    (v) => `${v.pattern}: ${v.excerpt}`
  );

  safeProgress(onProgress, {
    stage: "draft",
    status: "done",
    detail: `quality gate: ${warnings.length} warnings`,
  });

  return { outreach: correctedOutreach, qualityWarnings: warnings };
}
