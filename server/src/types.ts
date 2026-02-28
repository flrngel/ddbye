export type Channel = 'email' | 'linkedin' | 'x_dm';
export type Tone = 'respectful' | 'direct' | 'warm';
export type GoalType = 'sell' | 'partnership' | 'fundraise' | 'hire' | 'advice';
export type ResearchFocus =
  | 'person_background'
  | 'service_surface'
  | 'investment_thesis'
  | 'recent_signals'
  | 'objections';

// SERVER-SIDE: 8 states instead of frontend's 2-state 'running' | 'ready'
export type RequestStatus =
  | 'queued'
  | 'parsing'
  | 'resolving'
  | 'researching'
  | 'synthesizing'
  | 'drafting'
  | 'ready'
  | 'failed';

export type RunStageStatus = 'queued' | 'running' | 'done';

export interface RequestInput {
  targetBrief: string;
  objective: string;
  offer: string;
  preferredChannel: Channel;
  tone: Tone;
  goalType: GoalType;
  focuses: ResearchFocus[];
}

export interface RunStage {
  key: 'parse' | 'resolve' | 'research' | 'synthesize' | 'draft';
  label: string;
  detail: string;
  status: RunStageStatus;
}

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: 'Public web' | 'User brief' | 'Inference';
  sourceLabel: string;
  confidence: 'High' | 'Medium';
  usedFor: string;
}

export interface ResearchCard {
  title: string;
  body: string;
  bullets: string[];
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

export interface DiligenceRequest {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  input: RequestInput;
  parsedHints: string[];
  run: RunStage[];
  research?: ResearchPacket;
  outreach?: OutreachPacket;
}

export interface RequestSummary {
  id: string;
  title: string;
  status: RequestStatus;
  parsedHints: string[];
  preferredChannel: Channel;
  updatedAt: string;
}
