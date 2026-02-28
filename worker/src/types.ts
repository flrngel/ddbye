// Mirrored from src/types.ts — do not import from src/
// Keep in sync manually.

export type Channel = "email" | "linkedin" | "x_dm";
export type Tone = "respectful" | "direct" | "warm";
export type GoalType =
  | "sell"
  | "partnership"
  | "fundraise"
  | "hire"
  | "advice";
export type ResearchFocus =
  | "person_background"
  | "service_surface"
  | "investment_thesis"
  | "recent_signals"
  | "objections";

export interface RequestInput {
  targetBrief: string;
  objective: string;
  offer: string;
  preferredChannel: Channel;
  tone: Tone;
  goalType: GoalType;
  focuses: ResearchFocus[];
}

export interface ResearchCard {
  title: string;
  body: string;
  bullets: string[];
}

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: "Public web" | "User brief" | "Inference";
  sourceLabel: string;
  confidence: "High" | "Medium";
  usedFor: string;
}

export interface ResearchPacket {
  person: string;
  organization: string;
  surface: string;
  summary: string;
  whyThisTarget: string[];
  contextCards: ResearchCard[];
  recommendedAngle: {
    headline: string;
    rationale: string;
    mention: string[];
    avoid: string[];
  };
  evidence: EvidenceItem[];
}

export interface Deliverable {
  title: string;
  summary: string;
  subjects?: string[];
  body: string;
  followUp: string;
}

export interface OutreachPacket {
  email: Deliverable;
  linkedin: Deliverable;
  x_dm: Deliverable;
}

// --- Worker-specific types ---

export type RunStageKey =
  | "parse"
  | "resolve"
  | "research"
  | "synthesize"
  | "draft";

export interface ProgressEvent {
  stage: RunStageKey;
  status: "running" | "done";
  detail?: string;
}

export type OnProgress = (event: ProgressEvent) => void;

export interface WorkerResult {
  research: ResearchPacket;
  outreach: OutreachPacket;
  _qualityWarnings?: string[];
}

// --- Internal pipeline types ---

export interface ParsedJob {
  targetHypothesis: string;
  senderObjective: string;
  senderOffer: string;
  preferredChannel: Channel;
  tone: Tone;
  goalType: GoalType;
  focusAreas: ResearchFocus[];
}

export interface ResolvedTarget {
  person: string;
  organization: string;
  surface: string;
}

export interface ResearchContext {
  contextCards: ResearchCard[];
  evidence: EvidenceItem[];
}

export interface SynthesisResult {
  recommendedAngle: {
    headline: string;
    rationale: string;
    mention: string[];
    avoid: string[];
  };
  whyThisTarget: string[];
  summary: string;
}

export interface QualityViolation {
  pattern: string;
  excerpt: string;
}

export interface QualityGateResult {
  passed: boolean;
  violations: QualityViolation[];
}
