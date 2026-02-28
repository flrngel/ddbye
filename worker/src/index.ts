import { validateApiKey } from "./agent.js";
import {
  stepParse,
  stepResolve,
  stepResearch,
  stepSynthesize,
  stepDraft,
  stepQualityGate,
} from "./pipeline.js";
import type {
  RequestInput,
  OnProgress,
  WorkerResult,
  ResearchPacket,
} from "./types.js";

export type {
  RequestInput,
  OnProgress,
  ProgressEvent,
  WorkerResult,
  ResearchPacket,
  OutreachPacket,
  EvidenceItem,
  ResearchCard,
  Deliverable,
  RunStageKey,
  Channel,
  Tone,
  GoalType,
  ResearchFocus,
} from "./types.js";

export {
  WorkerConfigError,
  UnresolvableTargetError,
  AgentQueryError,
} from "./errors.js";

export async function runDiligence(
  input: RequestInput,
  onProgress: OnProgress
): Promise<WorkerResult> {
  validateApiKey();

  // Step 1: Parse intake
  const job = await stepParse(input, onProgress);

  // Step 2: Resolve target (throws UnresolvableTargetError if surface is empty)
  const target = await stepResolve(job, onProgress);

  // Step 3: Expand context with web research
  const research = await stepResearch(job, target, onProgress);

  // Step 4: Synthesize wedge
  const synthesis = await stepSynthesize(job, target, research, onProgress);

  // Step 5: Draft outreach
  let outreach = await stepDraft(job, target, synthesis, onProgress);

  // Step 6: Quality gate (may re-run draft once)
  const gateResult = await stepQualityGate(
    outreach,
    research.evidence,
    job,
    target,
    synthesis,
    onProgress
  );
  outreach = gateResult.outreach;

  // Assemble final ResearchPacket
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

  return {
    research: researchPacket,
    outreach,
    ...(gateResult.qualityWarnings.length > 0
      ? { _qualityWarnings: gateResult.qualityWarnings }
      : {}),
  };
}
