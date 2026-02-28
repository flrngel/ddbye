# DDBye

Messy target brief in. Defensible outreach out.

A founder/sales tool that turns a fuzzy target description into due-diligence research and channel-specific outreach (email, LinkedIn DM, X DM). The system never writes copy before resolving the target.

## Quick start

### Frontend only (mock mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000 (if port 3000 is busy, Vite picks the next available and prints the URL).

The frontend runs standalone with simulated agent data -- no server or API key needed. Two seeded demos are pre-loaded (PG/Hacker News and a16z/Andreessen).

### Full stack (API mode)

Terminal 1 -- API server:

```bash
cd server
npm install
npm run dev
```

Server runs on http://localhost:3001.

Terminal 2 -- Frontend connected to server:

```bash
VITE_API_BASE=http://localhost:3001 npm run dev
```

Note: the server currently returns stub data (PG/Hacker News) for all requests. The real Claude Agent SDK worker is implemented in `worker/` but not yet wired to the server.

## What to test

### Landing page (`/`)

- Marketing copy renders with the console preview
- "Open console" button navigates to `/console`

### Console page (`/console`)

1. **Intake form** (left panel)
   - Fill in the brief, objective, offer fields
   - Select channel (Email / LinkedIn DM / X DM)
   - Select tone (Respectful / Direct / Warm)
   - Select goal type (Sell, Partnership, Fundraise, Recruit, Advice)
   - Toggle research focus checkboxes
   - Click "Load PG example" or "Load a16z example" to auto-fill

2. **Submit and watch the agent run**
   - Click "Run diligence"
   - Watch the 5-stage progress bar animate: Parse -> Resolve -> Research -> Synthesize -> Draft
   - Takes ~5 seconds in mock mode

3. **Research board** (after completion)
   - Person, organization, surface summary
   - "Why this target" bullets
   - Context cards with expandable details
   - Recommended angle (headline, rationale, mention/avoid)
   - Evidence table with provenance labels (User brief / Public web / Inference)

4. **Outreach studio** (after completion)
   - Three channel tabs: Email, LinkedIn DM, X DM
   - Each shows subject lines (email only), body, follow-up
   - Copy button on each draft

5. **Request management**
   - Sidebar lists all requests with status badges
   - Click to switch between requests
   - Delete button removes a request
   - Retry re-runs the same brief
   - Redraft changes tone/channel and re-generates

## Project structure

```
.
├── src/                  # React frontend (Vite + Tailwind v4)
│   ├── pages/            # Landing.tsx, Console.tsx
│   ├── store/            # AppContext.tsx (all state)
│   ├── logic/            # mockAgent.ts (simulation)
│   ├── lib/              # api.ts (server client), utils, time
│   ├── components/       # SectionCard, ui/ (Button, Badge, etc.)
│   ├── data/             # sampleCases.ts (seeded demos)
│   └── types.ts          # Domain model
├── server/               # Hono API server + SQLite
│   └── src/              # routes, db, sse, worker stub
├── worker/               # Claude Agent SDK research pipeline
│   └── src/              # agent, pipeline, prompts, schemas
├── tests/                # Vitest unit + Playwright e2e
├── docs/                 # Design docs and planning
└── contracts/            # Example JSON payloads
```

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run lint:eslint` | ESLint check |
| `npm test` | Run Vitest unit tests (36 tests) |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run format` | Format with Prettier |

## Tech stack

- **Frontend**: React 19, TypeScript (strict), Vite 7, Tailwind CSS v4, React Router v7
- **Server**: Hono, better-sqlite3, SSE streaming
- **Worker**: Claude Agent SDK, Zod schemas
- **Testing**: Vitest, Playwright, ESLint
