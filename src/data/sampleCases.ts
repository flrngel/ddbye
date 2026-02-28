import type { DiligenceRequest } from '@/types';

export const seededCases: DiligenceRequest[] = [
  {
    id: 'seed-pg-hn',
    title: 'PG / Hacker News / Search wedge',
    status: 'ready',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    input: {
      targetBrief:
        'PG, famous for YC — want to explore doing business with Hacker News, one of the things he built. Curious how the search experience could be improved.',
      objective:
        'Legitimately highlight the search/discovery problem on Hacker News and propose our search product without being too aggressive.',
      offer:
        'We build hosted search that can be embedded quickly, with ranking controls, analytics, and a lightweight implementation path.',
      preferredChannel: 'email',
      tone: 'respectful',
      goalType: 'sell',
      focuses: ['person_background', 'service_surface', 'recent_signals', 'objections'],
    },
    parsedHints: ['Paul Graham', 'Hacker News', 'search / retrieval wedge', 'email'],
    run: [
      { key: 'parse', label: 'Parsing brief', detail: 'Resolve the messy target description into a person, org, and product surface.', status: 'done' },
      { key: 'resolve', label: 'Resolving target', detail: 'Confirm the relevant decision-maker and separate YC from the Hacker News surface.', status: 'done' },
      { key: 'research', label: 'Researching surface', detail: 'Map the pitch to archive retrieval and discovery instead of insulting the current product.', status: 'done' },
      { key: 'synthesize', label: 'Finding the wedge', detail: 'Turn the research into one defendable reason to reach out now.', status: 'done' },
      { key: 'draft', label: 'Writing outreach', detail: 'Generate title, subject lines, email, and short-form DMs.', status: 'done' },
    ],
    research: {
      person: 'Paul Graham',
      organization: 'Hacker News / YC orbit',
      surface: 'Hacker News archive search and on-site discovery',
      summary:
        'The useful target here is not YC in general. It is the Hacker News surface itself: a long-lived archive where retrieval quality directly changes how much value readers can get out of old discussions.',
      whyThisTarget: [
        'Paul Graham is relevant because the brief is anchored on HN as one of the services he is publicly associated with.',
        'The strongest commercial angle is a product utility wedge, not a generic founder networking message.',
        'A respectful outreach needs to preserve product taste and community sensitivity while still naming a clear improvement area.',
      ],
      contextCards: [
        {
          title: 'What the agent should learn about the target',
          body: 'Separate the person from the surface. The user is not asking for YC fundraising here; they are asking for a business wedge around Hacker News.',
          bullets: [
            'Resolve the person and confirm why they matter to this surface.',
            'Map whether the real decision is product stewardship, partnership, or founder interest.',
            'Treat HN as the product surface being pitched, not YC as the buyer by default.',
          ],
        },
        {
          title: 'What to inspect on the product surface',
          body: 'The attack surface is search, retrieval, and archive discovery. That is where an external product can be made concrete instead of hand-wavy.',
          bullets: [
            'How easy is it to find old discussions by topic, phrase, or intent?',
            'Does search feel like a utility gap or just a cosmetic issue?',
            'What is the smallest plausible insertion point for a mock or proof-of-concept?',
          ],
        },
        {
          title: 'What the pitch should sound like',
          body: 'The tone should frame the offer as leverage for already-valuable content, not as a critique of a beloved product.',
          bullets: [
            'Lead with archive value and reader utility.',
            'Offer a one-page mock instead of demanding a meeting.',
            'Avoid phrasing that sounds like \"your search is bad\".',
          ],
        },
      ],
      recommendedAngle: {
        headline: 'Lead with archive retrieval leverage, not with product criticism.',
        rationale:
          'A founder-style pitch works better when it names a concrete utility gain and respects the existing product. The goal is to show a wedge that feels obvious in hindsight, not to dunk on the current experience.',
        mention: [
          'HN has years of valuable discussion that compounds as the archive grows.',
          'A lightweight search layer can make old threads meaningfully more retrievable without changing the community model.',
          'Offer to send a one-page mock showing a narrow insertion point instead of forcing a call.',
        ],
        avoid: [
          'Do not say the product is bad or broken.',
          'Do not act as if you already know implementation constraints.',
          'Do not widen the pitch into a vague \"we can help with AI\" message.',
        ],
      },
      evidence: [
        {
          id: 'pg-1',
          claim: 'The user brief explicitly names PG and Hacker News as the target and the relevant service surface.',
          sourceType: 'User brief',
          sourceLabel: 'Intake brief',
          confidence: 'High',
          usedFor: 'Resolve the target and prevent the pitch from drifting into YC fundraising copy.',
        },
        {
          id: 'pg-2',
          claim: 'The ask is about doing business around search/discovery, which makes the product surface more important than generic founder background.',
          sourceType: 'Inference',
          sourceLabel: 'Objective mapping',
          confidence: 'Medium',
          usedFor: 'Choose a product wedge instead of a networking wedge.',
        },
        {
          id: 'pg-3',
          claim: 'A respectful outreach should make the benefit concrete without insulting the current experience.',
          sourceType: 'Inference',
          sourceLabel: 'Tone + target fit',
          confidence: 'Medium',
          usedFor: 'Set the message tone and remove abrasive phrasing.',
        },
      ],
    },
    outreach: {
      email: {
        title: 'Email: respectful product wedge',
        summary: 'Default output when the goal is to open the door with a concrete idea and a low-friction next step.',
        subjects: [
          'A lightweight search mock for Hacker News',
          'An idea for making old HN threads easier to retrieve',
          'A narrow search wedge for Hacker News',
        ],
        body: `Hi Paul,\n\nI have been looking at Hacker News as a product surface rather than just as a community, and one thing that stands out is how much value is locked in the archive once discussions age out of the homepage.\n\nWe build hosted search infrastructure that can be embedded quickly, and I think there is a narrow way to make old HN threads easier to retrieve without changing the core product or community model.\n\nRather than force a meeting, I would be happy to send over a one-page mock that shows a very small insertion point and what the experience could look like in practice.\n\nIf that is interesting, I can send it across.\n\nBest,\n[Your Name]`,
        followUp:
          'Happy to send the one-page mock first so you can react to something concrete before deciding whether a conversation is worth it.',
      },
      linkedin: {
        title: 'LinkedIn DM: concise version',
        summary: 'A shorter version that keeps the same wedge but drops the extra framing.',
        body:
          'Hi Paul - I have been looking at Hacker News from a product angle and think there is a narrow search/discovery improvement around retrieving old threads from the archive. We build hosted search infrastructure and I could send a one-page mock instead of asking for a meeting upfront if useful.',
        followUp: 'If helpful, I can send the one-page mock here.',
      },
      x_dm: {
        title: 'X DM: shortest version',
        summary: 'Use only when you need to earn permission quickly.',
        body:
          'Hi Paul - had a product idea for Hacker News around making old threads easier to retrieve from the archive. We build search infra and I can send a one-page mock rather than ask for time upfront if useful.',
        followUp: 'Can send the mock if you want to glance at it first.',
      },
    },
  },
  {
    id: 'seed-a16z',
    title: 'Andreessen / a16z / Investment-fit brief',
    status: 'ready',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    input: {
      targetBrief:
        'Want to look at Andreessen from a16z as an investment target. Need to lay out why we\'re worth looking at from his/the fund\'s perspective.',
      objective:
        'Don\'t write a generic fundraising message — make it short and punchy, centered on thesis fit.',
      offer:
        'We are building workflow software for operators in AI-native support teams, with strong retention and a wedge around quality review + automation.',
      preferredChannel: 'email',
      tone: 'direct',
      goalType: 'fundraise',
      focuses: ['person_background', 'investment_thesis', 'recent_signals', 'objections'],
    },
    parsedHints: ['Marc Andreessen', 'Andreessen Horowitz', 'investment fit', 'email'],
    run: [
      { key: 'parse', label: 'Parsing brief', detail: 'Resolve the person, the firm, and the actual fundraising job.', status: 'done' },
      { key: 'resolve', label: 'Resolving target', detail: 'Turn a vague VC target into an investor profile and a firm-fit question.', status: 'done' },
      { key: 'research', label: 'Researching context', detail: 'Look for category fit, thesis language, and likely objections.', status: 'done' },
      { key: 'synthesize', label: 'Finding the wedge', detail: 'Compress the story into a reason this is worth attention now.', status: 'done' },
      { key: 'draft', label: 'Writing outreach', detail: 'Write a thesis-fit email with a lightweight next ask.', status: 'done' },
    ],
    research: {
      person: 'Marc Andreessen',
      organization: 'Andreessen Horowitz',
      surface: 'Investment-fit thesis and category alignment',
      summary:
        'When the user names a high-profile investor, the job is not to flatter the investor. The job is to show why this company belongs in that firm’s conversation and why the note is worth reading right now.',
      whyThisTarget: [
        'The user is explicitly asking for investment-fit diligence, not generic outreach copy.',
        'The useful research object is the firm and the investor worldview, not only the biography of the individual.',
        'The draft should earn the right to send a memo or short deck, not demand a heavy meeting on first contact.',
      ],
      contextCards: [
        {
          title: 'What the agent should learn about the investor',
          body: 'Map the investor and firm into a working thesis profile that can actually shape the copy.',
          bullets: [
            'What categories appear repeatedly in the firm’s public language and portfolio?',
            'What scale expectations are likely to matter?',
            'What style of founder signal tends to get attention?',
          ],
        },
        {
          title: 'What the pitch should prove',
          body: 'The first note should make the reader believe there is a fit hypothesis worth checking, not that a full diligence process is already complete.',
          bullets: [
            'Why this market matters.',
            'Why this team has earned attention.',
            'Why the timing is better than a generic \"we are raising\" message.',
          ],
        },
      ],
      recommendedAngle: {
        headline: 'Pitch thesis fit, not generic fundraising intent.',
        rationale:
          'A credible investor outreach note earns attention by sounding like a tight category memo in miniature. The investor should feel the fit before they feel the ask.',
        mention: [
          'Use the category language the investor would already recognize.',
          'State the wedge, traction signal, and why now without overexplaining.',
          'Ask permission to send a short memo or deck instead of forcing a call.',
        ],
        avoid: [
          'Do not over-index on praise or reputation.',
          'Do not make the note sound like a mass investor blast.',
          'Do not ask for a long meeting before proving relevance.',
        ],
      },
      evidence: [
        {
          id: 'a16z-1',
          claim: 'The user brief is about investment-fit diligence rather than a cold sales pitch.',
          sourceType: 'User brief',
          sourceLabel: 'Intake brief',
          confidence: 'High',
          usedFor: 'Choose a thesis-fit note instead of a partnership email.',
        },
        {
          id: 'a16z-2',
          claim: 'The outbound note should earn the right to share a memo or deck rather than jump directly to a meeting.',
          sourceType: 'Inference',
          sourceLabel: 'Ask design',
          confidence: 'Medium',
          usedFor: 'Lower the friction of the CTA.',
        },
      ],
    },
    outreach: {
      email: {
        title: 'Email: thesis-fit note',
        summary: 'Focused on category fit, timing, and a low-friction next ask.',
        subjects: ['A quick thesis-fit note for a16z', 'Why this AI workflow wedge may be worth a look', 'A short memo-worthy company in AI operations'],
        body: `Hi Marc,\n\nI am reaching out because we are building workflow software for AI-native support teams, and I think the company is best understood as an infrastructure wedge around quality review plus automation rather than as another generic support tool.\n\nWhat feels notable right now is that retention is strong, the workflow pain is urgent, and the product has started to become part of how operators control quality as automation increases.\n\nIf the category framing sounds directionally relevant, I would be glad to send a short memo rather than take your time with a meeting request upfront.\n\nBest,\n[Your Name]`,
        followUp: 'Happy to send the short memo first if that is easier.',
      },
      linkedin: {
        title: 'LinkedIn DM: thesis-fit opener',
        summary: 'A short investor note that still sounds targeted.',
        body:
          'Hi Marc - we are building workflow software for AI-native support teams, with a wedge around quality review + automation. I think the story reads more like infrastructure for operators than like generic support SaaS. Happy to send a short memo if that sounds directionally relevant.',
        followUp: 'Can send the memo here if useful.',
      },
      x_dm: {
        title: 'X DM: shortest investor ask',
        summary: 'Use for a very lightweight permission ask.',
        body:
          'Hi Marc - we are building an AI-operations workflow wedge around quality review + automation. I think it may fit an infrastructure-style lens more than a support-tool lens. Happy to send a short memo if useful.',
        followUp: 'Can send the memo if you want a quick skim.',
      },
    },
  },
  {
    id: 'seed-sam-keen',
    title: 'Sam Keen / Altered Craft / Newsletter coverage',
    status: 'ready',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    input: {
      targetBrief:
        'Sam Keen in Portland. He\'s an AI hackathon judge.',
      objective:
        'I want him to write about Algolia posts on his altered craft newsletter.',
      offer: 'cookies and red bulls',
      preferredChannel: 'email',
      tone: 'warm',
      goalType: 'partnership',
      focuses: ['person_background', 'recent_signals'],
    },
    parsedHints: ['Sam Keen', 'Portland', 'AI hackathon judge', 'Altered Craft newsletter', 'email'],
    run: [
      { key: 'parse', label: 'Parsing brief', detail: 'Extract the person, newsletter surface, and coverage ask.', status: 'done' },
      { key: 'resolve', label: 'Resolving target', detail: 'Confirm Sam Keen\'s identity, Portland AI scene presence, and newsletter details.', status: 'done' },
      { key: 'research', label: 'Researching context', detail: 'Map the newsletter audience, recent topics, and what kind of coverage pitch would land.', status: 'done' },
      { key: 'synthesize', label: 'Finding the wedge', detail: 'Find the angle that makes Algolia content relevant to Altered Craft readers.', status: 'done' },
      { key: 'draft', label: 'Writing outreach', detail: 'Write a casual, Portland-friendly pitch for newsletter coverage.', status: 'done' },
    ],
    research: {
      person: 'Sam Keen',
      organization: 'Altered Craft newsletter',
      surface: 'Newsletter coverage of Algolia content / AI search posts',
      summary:
        'Sam Keen is active in the Portland AI and tech community, known for judging AI hackathons and writing the Altered Craft newsletter. The ask is straightforward: get him to cover or feature Algolia-related posts in his newsletter. The wedge is making the content relevant to his audience rather than just asking for a favor.',
      whyThisTarget: [
        'Sam Keen writes Altered Craft, a newsletter that covers AI and tech topics — Algolia content on AI-powered search fits naturally.',
        'He is embedded in the Portland AI hackathon scene, which means he values builder-oriented content over marketing fluff.',
        'A casual, in-person-friendly approach works better than a formal media pitch for someone in this community.',
      ],
      contextCards: [
        {
          title: 'Who is Sam Keen',
          body: 'Portland-based AI community figure who judges hackathons and writes the Altered Craft newsletter covering AI and tech topics.',
          bullets: [
            'Active in Portland AI/tech meetup and hackathon scene.',
            'Writes Altered Craft — a newsletter with a builder/practitioner audience.',
            'Judges AI hackathons, meaning he values practical demos over slide decks.',
          ],
        },
        {
          title: 'What makes the pitch land',
          body: 'The pitch needs to frame Algolia content as genuinely useful to his readers, not as a sponsored plug.',
          bullets: [
            'Algolia posts about AI-powered search are relevant to his AI-practitioner audience.',
            'Frame it as sharing useful content, not asking for a media placement.',
            'Keep it casual — Portland tech scene runs on personal relationships and good vibes.',
          ],
        },
      ],
      recommendedAngle: {
        headline: 'Pitch the content as useful to his readers, not as a favor to you.',
        rationale:
          'Newsletter writers care about keeping their audience engaged. If Algolia content genuinely helps Altered Craft readers understand AI search better, the pitch writes itself. Add cookies and Red Bulls as a memorable, low-pressure sweetener.',
        mention: [
          'Algolia has been publishing posts on AI-powered search that overlap with what Altered Craft covers.',
          'Offer to point him to the most relevant pieces rather than dumping a list.',
          'The cookies and Red Bulls make the ask feel human and hackathon-coded rather than corporate.',
        ],
        avoid: [
          'Do not make it sound like a formal PR pitch.',
          'Do not over-explain Algolia — he likely already knows the product.',
          'Do not ask for guaranteed coverage — ask if the content is useful for his readers.',
        ],
      },
      evidence: [
        {
          id: 'sk-1',
          claim: 'Sam Keen is a Portland-based AI hackathon judge who writes the Altered Craft newsletter.',
          sourceType: 'User brief',
          sourceLabel: 'Target brief',
          confidence: 'High',
          usedFor: 'Resolve the target and understand the ask.',
        },
        {
          id: 'sk-2',
          claim: 'The objective is newsletter coverage of Algolia posts, not a sales pitch or partnership deal.',
          sourceType: 'User brief',
          sourceLabel: 'Objective',
          confidence: 'High',
          usedFor: 'Keep the outreach focused on content sharing, not business development.',
        },
        {
          id: 'sk-3',
          claim: 'Portland AI community is tight-knit and values casual, genuine interactions over formal pitches.',
          sourceType: 'Inference',
          sourceLabel: 'Community context',
          confidence: 'Medium',
          usedFor: 'Set the right tone — casual, builder-to-builder.',
        },
      ],
    },
    outreach: {
      email: {
        title: 'Email: casual newsletter coverage pitch',
        summary: 'Friendly, Portland-coded pitch that frames Algolia content as useful for Altered Craft readers.',
        subjects: [
          'Some AI search content that might fit Altered Craft',
          'Quick idea for your newsletter — AI-powered search stuff',
          'Cookies, Red Bulls, and a content idea for Altered Craft',
        ],
        body: `Hey Sam,\n\nI have been reading Altered Craft and really like how you cover the practical side of AI tooling. I think some of the recent Algolia posts on AI-powered search would resonate with your readers — they are more builder-oriented than marketing-heavy, which seems to match your vibe.\n\nRather than dump a list, I can point you to the 2-3 most relevant pieces and let you decide if any of them are worth a mention or a riff in the newsletter.\n\nAlso — I owe you cookies and Red Bulls for even reading this far. Happy to deliver those in person next time we cross paths at a Portland AI event.\n\nCheers,\n[Your Name]`,
        followUp:
          'Happy to send the 2-3 most relevant Algolia posts if you want a quick look.',
      },
      linkedin: {
        title: 'LinkedIn DM: short newsletter pitch',
        summary: 'Compact version that keeps the casual tone.',
        body:
          'Hey Sam - I have been reading Altered Craft and think some recent Algolia posts on AI-powered search would genuinely fit your audience. Happy to point you to the 2-3 most relevant ones instead of dumping a list. Also I owe you cookies and Red Bulls for reading this 😄',
        followUp: 'Can send the links here if you want a quick look.',
      },
      x_dm: {
        title: 'X DM: shortest version',
        summary: 'Quick, casual DM for maximum response rate.',
        body:
          'Hey Sam - love Altered Craft. Think some Algolia AI search posts would fit your readers. Happy to send the 2-3 best ones. Also: cookies and Red Bulls are on me 🍪',
        followUp: 'Want me to send the links?',
      },
    },
  },
];
