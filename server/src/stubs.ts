import type { ResearchPacket, OutreachPacket } from './types.js';

export const stubResearch: ResearchPacket = {
  person: 'Paul Graham',
  organization: 'Hacker News / YC orbit',
  surface: 'Hacker News archive search and on-site discovery',
  summary: 'The useful target here is the product surface, not YC broadly.',
  whyThisTarget: [
    'The user explicitly named PG and Hacker News.',
    'The strongest angle is a product wedge, not a networking ask.',
  ],
  contextCards: [
    {
      title: 'What to inspect',
      body: 'The product surface matters more than generic founder biography.',
      bullets: ['Search behavior', 'Archive retrieval', 'Smallest insertion point'],
    },
  ],
  recommendedAngle: {
    headline: 'Lead with archive retrieval leverage',
    rationale: 'Show a concrete utility gain without insulting the current product.',
    mention: ['archive value', 'small insertion point', 'one-page mock'],
    avoid: ['product insults', 'fake certainty'],
  },
  evidence: [
    {
      id: 'ev_1',
      claim: 'The brief names PG and Hacker News.',
      sourceType: 'User brief',
      sourceLabel: 'Intake',
      confidence: 'High',
      usedFor: 'Resolve target',
    },
  ],
};

export const stubOutreach: OutreachPacket = {
  email: {
    title: 'Email: respectful product wedge',
    summary: 'Default channel when the goal is to open the door with a low-friction ask.',
    subjects: [
      'A lightweight search mock for Hacker News',
      'An idea for making old HN threads easier to retrieve',
    ],
    body: 'Hi Paul, ...',
    followUp: 'Happy to send the one-page mock first.',
  },
  linkedin: {
    title: 'LinkedIn DM',
    summary: 'Shorter version.',
    body: 'Hi Paul - ...',
    followUp: 'Can send the one-page mock here if useful.',
  },
  x_dm: {
    title: 'X DM',
    summary: 'Shortest version.',
    body: 'Hi Paul - ...',
    followUp: 'Can send the mock if useful.',
  },
};
