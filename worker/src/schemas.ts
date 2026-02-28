import { z } from "zod/v4";

// --- Step 1: Parse ---

export const ParsedJobSchema = z.object({
  targetHypothesis: z
    .string()
    .describe("The target person/org/service hypothesis extracted from the brief"),
  senderObjective: z
    .string()
    .describe("What the sender wants to achieve"),
  senderOffer: z
    .string()
    .describe("What the sender is offering"),
  preferredChannel: z.enum(["email", "linkedin", "x_dm"]),
  tone: z.enum(["respectful", "direct", "warm"]),
  goalType: z.enum(["sell", "partnership", "fundraise", "hire", "advice"]),
  focusAreas: z
    .array(
      z.enum([
        "person_background",
        "service_surface",
        "investment_thesis",
        "recent_signals",
        "objections",
      ])
    )
    .describe("Research focus areas to investigate"),
});

// --- Step 2: Resolve ---

export const ResolvedTargetSchema = z.object({
  person: z
    .string()
    .describe("The decision-maker's full name, or empty string if unresolvable"),
  organization: z
    .string()
    .describe("The relevant organization or firm"),
  surface: z
    .string()
    .describe(
      "The specific product/service/relationship that is pitchable. Must be narrower than the organization when applicable. Empty string if unresolvable."
    ),
});

// --- Step 3: Research ---

const ResearchCardSchema = z.object({
  title: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
});

const EvidenceItemSchema = z.object({
  id: z.string(),
  claim: z.string(),
  sourceType: z.enum(["Public web", "User brief", "Inference"]),
  sourceLabel: z.string().describe("Human-readable source label, e.g. URL or 'Intake'"),
  confidence: z.enum(["High", "Medium"]),
  usedFor: z.string().describe("What this evidence supports in the outreach"),
});

export const ResearchContextSchema = z.object({
  contextCards: z
    .array(ResearchCardSchema)
    .describe("Research cards, one per focus area investigated"),
  evidence: z
    .array(EvidenceItemSchema)
    .describe("Evidence items with provenance labels"),
});

// --- Step 4: Synthesize ---

export const SynthesisResultSchema = z.object({
  recommendedAngle: z.object({
    headline: z.string().describe("One-line angle for the outreach"),
    rationale: z.string().describe("Why this wedge is defensible"),
    mention: z
      .array(z.string())
      .min(1)
      .describe("What the outreach should include (at least one item required)"),
    avoid: z
      .array(z.string())
      .describe("What the outreach should not say"),
  }),
  whyThisTarget: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1-3 bullets explaining why this target is worth reaching out to"),
  summary: z
    .string()
    .describe("One-paragraph summary of the research and recommended approach"),
});

// --- Step 5: Draft ---

const EmailDeliverableSchema = z.object({
  title: z.string(),
  summary: z.string(),
  subjects: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe("2-3 email subject line options"),
  body: z.string(),
  followUp: z.string(),
});

const DmDeliverableSchema = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  followUp: z.string(),
});

export const OutreachPacketSchema = z.object({
  email: EmailDeliverableSchema,
  linkedin: DmDeliverableSchema,
  x_dm: DmDeliverableSchema,
});

// --- Step 6: Quality Gate ---

const QualityViolationSchema = z.object({
  pattern: z
    .string()
    .describe(
      "Which pattern was violated: overclaiming | fake_familiarity | target_insult | unsupported_assertion | evidence_copy_mismatch"
    ),
  excerpt: z
    .string()
    .describe("The specific text that violates the pattern"),
});

export const QualityGateResultSchema = z.object({
  passed: z.boolean().describe("True if no violations found"),
  violations: z
    .array(QualityViolationSchema)
    .describe("List of violations found, empty if passed"),
});
