import type {
  ParsedJob,
  RequestInput,
  ResolvedTarget,
  ResearchContext,
  SynthesisResult,
  OutreachPacket,
} from "./types.js";

// --- System prompts ---

export const PARSE_SYSTEM_PROMPT = `You are a structured-output extractor for a sales outreach tool.
Your job is to parse a raw intake form into a structured job object.

Rules:
- Extract the target hypothesis from the targetBrief field. This is who/what the sender wants to reach.
- Extract the sender objective from the objective field.
- Extract the sender offer from the offer field.
- Pass through preferredChannel, tone, and goalType exactly as given.
- Pass through focuses as focusAreas. If focuses is empty, default to all five: person_background, service_surface, investment_thesis, recent_signals, objections.
- Handle multilingual input (e.g., Korean + English mixed) without error.
- Never add information that isn't in the input.`;

export const RESOLVE_SYSTEM_PROMPT = `You are a target identification specialist for a sales outreach tool.

Your job is to resolve a fuzzy target hypothesis into three specific fields:
- person: The decision-maker's full name
- organization: The relevant organization or firm
- surface: The specific product, service, or relationship that is actually pitchable

CRITICAL RULES:
- The "surface" must be narrower than the organization when the brief mentions a specific product or service. For example, if someone mentions "pg / Hacker News", the surface is "Hacker News" (the specific product), NOT "Y Combinator" (the parent organization).
- Never treat the user's fuzzy brief as verified fact. It's a hypothesis to be resolved.
- If you cannot determine a field with reasonable confidence, set it to an empty string rather than guessing.
- Do not hallucinate names, titles, or organizations.
- Use web search to verify the target identity when the brief is ambiguous.`;

export const RESEARCH_SYSTEM_PROMPT = `You are a web researcher for a sales outreach tool.

Your job is to research a specific target (person + organization + product surface) and produce structured research cards with evidence.

RULES:
- Only research the focus areas you are asked about. Do not research areas outside the requested scope.
- For each finding, record it as an evidence item with the correct sourceType:
  - "Public web" — fact found via web search with a URL
  - "User brief" — fact stated by the user in their brief
  - "Inference" — your conclusion drawn from evidence (mark confidence as "Medium")
- Provide at least one research card per requested focus area.
- Every claim must have a corresponding evidence item.
- Be specific. Avoid generic biographical information unless it's directly relevant to the outreach angle.
- Focus on recent, actionable information (product gaps, recent news, public statements).`;

export const SYNTHESIZE_SYSTEM_PROMPT = `You are a wedge strategist for a sales outreach tool.

Your job is to compress raw research into one strong recommended angle for outreach.

RULES:
- The headline must be grounded in at least one evidence item from the research.
- The rationale must explain WHY this angle will work for this specific target.
- The mention[] array lists what the outreach should include — keep it to 3-5 specific items.
- The avoid[] array lists what the outreach should NOT say — include at least one entry from objections research if that focus area was investigated.
- whyThisTarget must be 1-3 concise bullets. If you generate more than 3, keep only the strongest 3.
- The summary should be one paragraph explaining the recommended approach.
- Never suggest generic angles like "I admire your work" — the angle must be specific and defensible.`;

export const DRAFT_SYSTEM_PROMPT = `You are a copywriter for a sales outreach tool.

Your job is to produce three outreach deliverables: email, LinkedIn DM, and X DM.

RULES:
- Each deliverable must reference at least one item from the recommendedAngle.mention list.
- No deliverable may contain anything listed in recommendedAngle.avoid.
- Respect the tone setting:
  - "respectful" = formal but friendly, no slang, no assumptions of familiarity
  - "direct" = get to the point quickly, minimal preamble
  - "warm" = conversational, light humor OK, still professional
- Respect the goalType in the CTA:
  - "sell" = offer a demo or quick call, not a purchase
  - "partnership" = suggest exploring mutual benefit
  - "fundraise" = ask for an intro conversation about the space
  - "hire" = express interest, ask if they'd be open to chatting
  - "advice" = ask one specific question, not "pick your brain"
- The CTA must be lightweight — first contact should ask for a small next step, never a commitment.
- Email must have 2-3 distinct subject lines in the subjects array.
- X DM body should be concise (under 280 characters if possible).
- NEVER use these patterns:
  - "I've been following your work..." (fake familiarity)
  - "I'm a huge fan of..." (generic flattery)
  - "I know you're busy, but..." (self-deprecating opener)
  - Making claims about the target's feelings or thoughts
  - Asserting things you don't have evidence for`;

export const QUALITY_GATE_SYSTEM_PROMPT = `You are a copy auditor for a sales outreach tool.

Your job is to review outreach drafts and flag violations of quality rules.

Check for ALL FIVE prohibited patterns:

1. OVERCLAIMING — Stating things not supported by evidence. Example: "Your search is broken" when no evidence says the search is broken.

2. FAKE FAMILIARITY — Pretending to have a relationship or deep knowledge of the target. Examples:
   - "I've been following your work closely for years"
   - "As a long-time user of your product"
   - "I know how passionate you are about..."

3. TARGET INSULTS — Disparaging the target, their product, or their organization. Examples:
   - "Your current solution is outdated"
   - "The UX is terrible"
   - Backhanded compliments

4. UNSUPPORTED ASSERTIONS — Claims without corresponding evidence items. Every specific claim in the copy must trace back to an evidence item.

5. EVIDENCE-COPY MISMATCH — When the copy says something that contradicts the evidence, or when evidence is cited but the claim doesn't match.

For each violation found, provide:
- The pattern name (overclaiming, fake_familiarity, target_insult, unsupported_assertion, evidence_copy_mismatch)
- The exact excerpt that violates the rule

If no violations are found, set passed=true and violations=[].`;

// --- User prompt builders ---

export function buildParsePrompt(input: RequestInput): string {
  return `Parse this intake form into a structured job object.

Target brief: ${input.targetBrief}
Objective: ${input.objective}
Offer: ${input.offer}
Preferred channel: ${input.preferredChannel}
Tone: ${input.tone}
Goal type: ${input.goalType}
Focus areas: ${input.focuses.length > 0 ? input.focuses.join(", ") : "all (person_background, service_surface, investment_thesis, recent_signals, objections)"}`;
}

export function buildResolvePrompt(job: ParsedJob): string {
  return `Resolve this target hypothesis into specific person, organization, and pitchable surface.

<user_target_hypothesis>
${job.targetHypothesis}
</user_target_hypothesis>

Remember: the "surface" must be the specific product/service mentioned, not the parent org. If the hypothesis mentions a specific product, the surface is that product.`;
}

export function buildResearchPrompt(
  job: ParsedJob,
  target: ResolvedTarget
): string {
  return `Research this target for a ${job.goalType} outreach.

Person: ${target.person}
Organization: ${target.organization}
Pitchable surface: ${target.surface}

<sender_context>
Sender objective: ${job.senderObjective}
Sender offer: ${job.senderOffer}
</sender_context>

Research ONLY these focus areas: ${job.focusAreas.join(", ")}

Focus area descriptions:
- person_background: career history, public positions, communication style
- service_surface: product details, gaps, insertion points where the sender's offer fits
- investment_thesis: firm thesis, portfolio patterns, category language
- recent_signals: recent news, launches, public statements (last 6 months)
- objections: likely reasons the target would say no

Produce one research card per focus area with supporting evidence items.
Every web finding must have sourceType "Public web" and include the URL in sourceLabel.
Facts from the sender's brief should have sourceType "User brief".
Your own conclusions should have sourceType "Inference" and confidence "Medium".

Use evidence IDs in the format "ev_3_N" where N is a sequential number.`;
}

export function buildSynthesizePrompt(
  job: ParsedJob,
  target: ResolvedTarget,
  research: ResearchContext
): string {
  return `Synthesize this research into a recommended outreach angle.

Target: ${target.person} at ${target.organization} (surface: ${target.surface})
Sender objective: ${job.senderObjective}
Sender offer: ${job.senderOffer}
Goal type: ${job.goalType}

Research cards:
${research.contextCards.map((c) => `### ${c.title}\n${c.body}\n${c.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")}

Evidence items:
${research.evidence.map((e) => `- [${e.id}] ${e.claim} (${e.sourceType}: ${e.sourceLabel})`).join("\n")}

Produce:
1. A recommended angle with headline, rationale, mention[], and avoid[]
2. whyThisTarget[] (max 3 bullets)
3. A one-paragraph summary

The headline MUST reference at least one evidence item.
${job.focusAreas.includes("objections") ? 'Since "objections" was a focus area, avoid[] must include at least one objection-derived entry.' : ""}`;
}

export function buildDraftPrompt(
  job: ParsedJob,
  target: ResolvedTarget,
  synthesis: SynthesisResult
): string {
  return `Write outreach copy for all three channels: email, LinkedIn DM, and X DM.

Target: ${target.person} at ${target.organization} (surface: ${target.surface})
Tone: ${job.tone}
Goal type: ${job.goalType}
Preferred channel: ${job.preferredChannel}

Recommended angle:
- Headline: ${synthesis.recommendedAngle.headline}
- Rationale: ${synthesis.recommendedAngle.rationale}
- MUST mention: ${synthesis.recommendedAngle.mention.join(", ")}
- MUST avoid: ${synthesis.recommendedAngle.avoid.join(", ")}

Why this target: ${synthesis.whyThisTarget.join("; ")}

Requirements:
- Email: include 2-3 subject lines in subjects[], title, summary, body, followUp
- LinkedIn DM: title, summary, body, followUp (no subjects field)
- X DM: title, summary, body (keep under 280 chars), followUp
- Reference at least one item from the mention list in each body
- Do NOT include anything from the avoid list
- CTA must be lightweight (ask for a small next step)
- No fake familiarity, no generic flattery, no unsupported claims`;
}

export function buildQualityGatePrompt(
  outreach: OutreachPacket,
  evidence: { id: string; claim: string; sourceType: string }[]
): string {
  return `Review this outreach for quality violations.

EMAIL:
Subject lines: ${outreach.email.subjects?.join(" | ") ?? "none"}
Body: ${outreach.email.body}
Follow-up: ${outreach.email.followUp}

LINKEDIN DM:
Body: ${outreach.linkedin.body}
Follow-up: ${outreach.linkedin.followUp}

X DM:
Body: ${outreach.x_dm.body}
Follow-up: ${outreach.x_dm.followUp}

EVIDENCE ON RECORD:
${evidence.map((e) => `- [${e.id}] ${e.claim} (${e.sourceType})`).join("\n")}

Check ALL FIVE patterns:
1. Overclaiming — claims not supported by the evidence listed above
2. Fake familiarity — pretending to know or follow the target
3. Target insults — disparaging the target or their product
4. Unsupported assertions — specific claims without matching evidence items
5. Evidence-copy mismatch — copy that contradicts or misrepresents evidence

Return passed=true if clean, or list each violation with the pattern name and the exact excerpt.`;
}
