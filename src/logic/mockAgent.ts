import { seededCases } from '@/data/sampleCases';
import type { DiligenceRequest, RequestInput, ResearchFocus, RunStage } from '@/types';

const stageTemplate: RunStage[] = [
  {
    key: 'parse',
    label: 'Parsing brief',
    detail: 'Turn a messy human description into a structured target, objective, and deliverable.',
    status: 'running',
  },
  {
    key: 'resolve',
    label: 'Resolving target',
    detail: 'Figure out who the person is, what org or service matters, and which surface is actually pitchable.',
    status: 'queued',
  },
  {
    key: 'research',
    label: 'Researching context',
    detail: 'Expand the target with product, thesis, and timing context.',
    status: 'queued',
  },
  {
    key: 'synthesize',
    label: 'Finding the wedge',
    detail: 'Compress the research into one defendable reason to reach out.',
    status: 'queued',
  },
  {
    key: 'draft',
    label: 'Writing outreach',
    detail: 'Write title, subject, and channel-specific outreach.',
    status: 'queued',
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildTitle(input: RequestInput) {
  const brief = input.targetBrief.trim();
  const head = brief.split(/[.!?\n]/)[0].trim();
  return head.length > 48 ? `${head.slice(0, 45)}...` : head;
}

function normalize(text: string) {
  return text.toLowerCase();
}

function inferHints(input: RequestInput): string[] {
  const lower = normalize(`${input.targetBrief} ${input.objective}`);
  const hints: string[] = [];
  if (lower.includes('pg') || lower.includes('paul graham')) hints.push('Paul Graham');
  if (lower.includes('hacker news') || lower.includes('hn')) hints.push('Hacker News');
  if (lower.includes('andreessen') || lower.includes('a16z') || lower.includes('marc')) hints.push('Andreessen / a16z');
  if (lower.includes('sam keen') || lower.includes('altered craft')) hints.push('Sam Keen');

  // Dynamic fallback: extract person name from brief instead of showing "Unresolved target"
  if (!hints.length) {
    const person = extractPerson(input.targetBrief);
    hints.push(person);
  }

  // Add goal type as a readable hint
  const goalHint = input.goalType === 'fundraise' ? 'Investment fit' : input.goalType === 'partnership' ? 'Partnership' : input.goalType === 'sell' ? 'Sales' : input.goalType === 'hire' ? 'Recruiting' : 'Advice / intro';
  hints.push(goalHint);

  hints.push(input.preferredChannel === 'x_dm' ? 'X DM' : input.preferredChannel === 'linkedin' ? 'LinkedIn DM' : 'Email');
  return hints;
}

function focusToLabel(focus: ResearchFocus) {
  switch (focus) {
    case 'person_background':
      return 'person background';
    case 'service_surface':
      return 'service surface';
    case 'investment_thesis':
      return 'investment thesis';
    case 'recent_signals':
      return 'recent signals';
    case 'objections':
      return 'likely objections';
  }
}

function fillSeed(base: DiligenceRequest, input: RequestInput): DiligenceRequest {
  const now = new Date().toISOString();
  const channelLabel = input.preferredChannel === 'linkedin' ? 'LinkedIn DM' : input.preferredChannel === 'x_dm' ? 'X DM' : 'email';
  const offerSnippet = input.offer.trim() || 'our product';
  const objectiveSnippet = input.objective.trim() || 'open a conversation';

  const clone = structuredClone(base) as DiligenceRequest;
  clone.id = uid();
  clone.title = buildTitle(input);
  clone.createdAt = now;
  clone.updatedAt = now;
  clone.status = 'running';
  clone.input = input;
  clone.parsedHints = [...new Set([...inferHints(input), ...clone.parsedHints])];
  clone.run = stageTemplate.map((item) => ({ ...item }));

  if (clone.research) {
    clone.research.summary = `${clone.research.summary} The requested deliverable is ${channelLabel.toLowerCase()}, and the working objective is: ${objectiveSnippet}.`;
    clone.research.evidence = [
      {
        id: `${clone.id}-brief-1`,
        claim: `The user offer is: ${offerSnippet}`,
        sourceType: 'User brief',
        sourceLabel: 'Offer / context',
        confidence: 'High',
        usedFor: 'Ground the draft in what the sender can actually offer.',
      },
      {
        id: `${clone.id}-brief-2`,
        claim: `The requested outcome is: ${objectiveSnippet}`,
        sourceType: 'User brief',
        sourceLabel: 'Objective',
        confidence: 'High',
        usedFor: 'Keep the wedge aligned with the real ask.',
      },
      ...clone.research.evidence,
    ];
  }

  if (clone.outreach) {
    clone.outreach.email.body = clone.outreach.email.body.replace('We build hosted search infrastructure that can be embedded quickly,', `${offerSnippet.replace(/\.$/, '')},`).replace('our product has started to become part of how operators control quality as automation increases.', `${offerSnippet.replace(/\.$/, '')} is the part of our story that seems most relevant here.`);
    clone.outreach.email.followUp = clone.outreach.email.followUp.replace('memo', 'memo or one-pager');
  }

  return clone;
}

/** Extract a likely person name from the brief (first capitalized multi-word phrase or parenthetical handle). */
function extractPerson(brief: string): string {
  // Try "Firstname Lastname" pattern — capitalized words at start or after punctuation
  const nameMatch = brief.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (nameMatch) return nameMatch[1];
  // Fallback: first sentence chunk
  const first = brief.split(/[.!?\n,]/)[0].trim();
  return first.length > 40 ? first.slice(0, 37) + '...' : first;
}

/** Pull extra context clues from the brief (company names, roles, locations). */
function extractContext(brief: string): string {
  const sentences = brief.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length > 1) return sentences.slice(1).join('. ');
  return '';
}

function buildGenericCase(input: RequestInput): DiligenceRequest {
  const now = new Date().toISOString();
  const focusLabels = input.focuses.map(focusToLabel);
  const personName = extractPerson(input.targetBrief);
  const firstName = personName.split(/\s/)[0];
  const extraContext = extractContext(input.targetBrief);
  const targetLabel = input.targetBrief.split(/[.!?\n]/)[0].trim() || 'Target under review';
  const goalLabel = input.goalType === 'fundraise' ? 'investment-fit outreach' : input.goalType === 'partnership' ? 'partnership outreach' : input.goalType === 'sell' ? 'sales outreach' : input.goalType === 'hire' ? 'recruiting outreach' : 'advice ask';
  const offerShort = input.offer.trim() || 'our product';
  const objectiveShort = input.objective.trim() || 'open a conversation';

  return {
    id: uid(),
    title: buildTitle(input),
    status: 'running',
    createdAt: now,
    updatedAt: now,
    input,
    parsedHints: inferHints(input),
    run: stageTemplate.map((item) => ({ ...item })),
    research: {
      person: personName,
      organization: extraContext || `${personName}'s network`,
      surface: `${goalLabel} — researching ${personName}`,
      summary: `The target is ${personName}. ${extraContext ? extraContext + '. ' : ''}The agent is researching ${personName}'s background, professional context, and recent activity to find the strongest angle for outreach. In production, this section would be populated with real web research about ${personName}.`,
      whyThisTarget: [
        `${personName} was identified from the brief as the primary outreach target.`,
        `The requested goal is ${goalLabel}, which shapes the research direction and message tone.`,
        focusLabels.length ? `Research focus areas: ${focusLabels.join(', ')}.` : 'The agent will research broadly across all available signals.',
      ],
      contextCards: [
        {
          title: `About ${personName}`,
          body: `${personName} was identified from the user's brief. In production, the agent would search the web for ${personName}'s professional background, recent activity, and public presence.`,
          bullets: [
            `Primary target: ${personName}`,
            extraContext ? `Context from brief: ${extraContext.slice(0, 100)}` : `The agent would search for ${personName}'s LinkedIn, Twitter/X, personal site, and recent mentions.`,
            `Goal type: ${goalLabel}`,
          ],
        },
        {
          title: 'What the agent would research',
          body: `In production, the agent searches the web to build a profile of ${personName} before writing any outreach.`,
          bullets: [
            `${personName}'s current role, company, and professional background.`,
            `Recent public activity — posts, talks, interviews, projects.`,
            'Signals that would make outreach timely and relevant.',
          ],
        },
      ],
      recommendedAngle: {
        headline: `Find what ${personName} cares about, then connect to your offer.`,
        rationale: `The outreach should feel targeted to ${personName} specifically. The agent needs to research ${personName}'s context first, then find the natural connection point.`,
        mention: [
          `Reference ${personName}'s recent work or public activity.`,
          `Find the overlap between what ${personName} cares about and your objective.`,
          'Keep the CTA lightweight — a memo, a link, or a quick async exchange.',
        ],
        avoid: [
          'Do not send a generic template that could go to anyone.',
          'Do not lead with your product — lead with why the target would care.',
          'Do not ask for a big commitment upfront (long call, formal meeting).',
        ],
      },
      evidence: [
        {
          id: 'generic-1',
          claim: `Target identified as ${personName} from the user brief.`,
          sourceType: 'User brief',
          sourceLabel: 'Target brief',
          confidence: 'High',
          usedFor: 'Resolve the primary outreach target.',
        },
        {
          id: 'generic-2',
          claim: `Stated objective: ${objectiveShort}`,
          sourceType: 'User brief',
          sourceLabel: 'Objective',
          confidence: 'High',
          usedFor: 'Shape the outreach wedge and CTA.',
        },
      ],
    },
    outreach: {
      email: {
        title: `Email to ${personName}`,
        summary: `Personalized ${goalLabel} note grounded in the brief.`,
        subjects: [
          `Quick note for ${firstName} — ${offerShort.slice(0, 30)}`,
          `An idea I think is relevant to you, ${firstName}`,
          `${firstName} — thought this might be worth a look`,
        ],
        body: `Hi ${firstName},\n\n${extraContext ? `I came across your work — ${extraContext.slice(0, 100).toLowerCase()}` : `I have been looking into your background`} and think there is a specific reason for us to connect that goes beyond a generic cold note.\n\n${offerShort}\n\nThe reason I am reaching out: ${objectiveShort}. Rather than take your time with a long pitch, I would be happy to send over a short one-pager so you can see if it is worth a conversation.\n\nBest,\n[Your Name]`,
        followUp: 'Happy to send the one-pager first so you can react to something concrete.',
      },
      linkedin: {
        title: `LinkedIn DM to ${personName}`,
        summary: 'Shorter version of the same personalized wedge.',
        body: `Hi ${firstName} - ${extraContext ? extraContext.slice(0, 60).toLowerCase() + ' caught my attention. ' : ''}I think there is a specific reason for us to connect. ${offerShort} The reason for the outreach: ${objectiveShort}. Happy to send a short one-pager if useful.`,
        followUp: 'Can send the one-pager here if helpful.',
      },
      x_dm: {
        title: `X DM to ${personName}`,
        summary: 'Shortest version — earn permission to share more.',
        body: `Hi ${firstName} - ${offerShort.slice(0, 60)} and I think it connects to what you are working on. ${objectiveShort.slice(0, 60)}. Happy to send a quick one-pager if useful.`,
        followUp: 'Want me to send the one-pager?',
      },
    },
  };
}

export function createSimulatedRequest(input: RequestInput): DiligenceRequest {
  const lower = normalize(`${input.targetBrief} ${input.objective} ${input.offer}`);

  if (lower.includes('pg') || lower.includes('paul graham') || lower.includes('hacker news') || lower.includes('hn')) {
    return fillSeed(seededCases[0], input);
  }

  if (lower.includes('andreessen') || lower.includes('a16z') || lower.includes('marc')) {
    return fillSeed(seededCases[1], input);
  }

  if (lower.includes('sam keen') || lower.includes('altered craft') || lower.includes('sam') && lower.includes('keen')) {
    return fillSeed(seededCases[2], input);
  }

  return buildGenericCase(input);
}

export function advanceRun(run: RunStage[]): RunStage[] {
  const currentIndex = run.findIndex((stage) => stage.status === 'running');
  if (currentIndex === -1) return run;

  return run.map((stage, index) => {
    if (index < currentIndex) return { ...stage, status: 'done' };
    if (index === currentIndex) return { ...stage, status: 'done' };
    if (index === currentIndex + 1) return { ...stage, status: 'running' };
    return { ...stage, status: 'queued' };
  });
}
