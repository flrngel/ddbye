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
  if (!hints.length) hints.push('Unresolved target');
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

function buildGenericCase(input: RequestInput): DiligenceRequest {
  const now = new Date().toISOString();
  const focusLabels = input.focuses.map(focusToLabel);
  const targetLabel = input.targetBrief.split(/[.!?\n]/)[0].trim() || 'Target under review';
  const goalLabel = input.goalType === 'fundraise' ? 'investment-fit outreach' : input.goalType === 'partnership' ? 'partnership outreach' : input.goalType === 'sell' ? 'sales outreach' : input.goalType === 'hire' ? 'recruiting outreach' : 'advice ask';

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
      person: 'Target to be resolved',
      organization: 'Org or service to be resolved',
      surface: 'Best surface to pitch',
      summary: 'This generic case shows the shape of the output when the frontend cannot map the brief to a seeded demo. In production, the agent would resolve the person, org, and pitchable surface from the messy brief before writing copy.',
      whyThisTarget: [
        'The first job is resolving the person, org, and relevant service surface.',
        `The requested goal is ${goalLabel}.`,
        focusLabels.length ? `The user asked the agent to look harder at: ${focusLabels.join(', ')}.` : 'The user did not add extra research focus filters.',
      ],
      contextCards: [
        {
          title: 'How the agent should read the brief',
          body: 'Treat the user input as a messy human description, not as a polished prompt.',
          bullets: [
            'Resolve who the target actually is.',
            'Find the product, firm, or relationship surface that matters.',
            'Separate target research from outreach generation.',
          ],
        },
        {
          title: 'How the agent should build the wedge',
          body: 'The right wedge should sound like an obvious next step once the context is assembled.',
          bullets: [
            'What does the target likely care about?',
            'What part of the sender offer is most relevant?',
            'What is the lightest plausible ask?',
          ],
        },
      ],
      recommendedAngle: {
        headline: 'Start with a defendable wedge instead of writing copy too early.',
        rationale: 'The user wants due diligence before outreach. That means the system should resolve the target and context first, then write the message.',
        mention: [
          `Anchor the message around the stated objective: ${input.objective}`,
          `Ground the message in the actual offer: ${input.offer}`,
          'Choose the smallest next step that still moves the conversation forward.',
        ],
        avoid: [
          'Do not write generic praise.',
          'Do not pretend certainty where the target is still unresolved.',
          'Do not let the copy get ahead of the diligence.',
        ],
      },
      evidence: [
        {
          id: 'generic-1',
          claim: `User target brief: ${targetLabel}`,
          sourceType: 'User brief',
          sourceLabel: 'Target brief',
          confidence: 'High',
          usedFor: 'Resolve the target and scope the research job.',
        },
        {
          id: 'generic-2',
          claim: `User objective: ${input.objective}`,
          sourceType: 'User brief',
          sourceLabel: 'Objective',
          confidence: 'High',
          usedFor: 'Choose the outreach wedge and CTA.',
        },
      ],
    },
    outreach: {
      email: {
        title: 'Email draft',
        summary: 'Structured to stay grounded in the resolved target and the smallest useful ask.',
        subjects: ['A quick idea after looking at this target', 'Potential wedge worth sending over', 'A targeted note based on this surface'],
        body: `Hi [Name],\n\nI have been looking into ${targetLabel} and think there may be a concrete reason for us to talk that is more specific than a generic cold note.\n\n${input.offer}\n\nThe reason I am reaching out is ${input.objective}. If useful, I can send a short memo or one-pager first so you can react to something concrete before deciding whether a conversation makes sense.\n\nBest,\n[Your Name]`,
        followUp: 'Happy to send the short memo or one-pager first.',
      },
      linkedin: {
        title: 'LinkedIn DM draft',
        summary: 'Compact version of the same wedge.',
        body: `Hi - I looked into ${targetLabel} and think there may be a specific reason for us to talk rather than a generic cold note. ${input.offer} The key reason for the outreach is ${input.objective}. Happy to send a short one-pager if useful.`,
        followUp: 'Can send the one-pager here if that helps.',
      },
      x_dm: {
        title: 'X DM draft',
        summary: 'Shortest version that still keeps the wedge clear.',
        body: `Hi - looked into ${targetLabel} and think there is a real wedge here beyond a generic cold note. ${input.offer} Happy to send a short one-pager if useful.`,
        followUp: 'Can send the one-pager if you want a quick skim.',
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
