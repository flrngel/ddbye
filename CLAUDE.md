skip unnecessary tests, we are running out of time, and this is a hackathon prototype. 

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**DDBye** — a frontend-only prototype for a founder/sales tool that turns a messy target brief into due-diligence research and channel-specific outreach (email, LinkedIn DM, X DM). There is no backend; the agent run is simulated in the frontend with seeded data and timers.

The core workflow: **messy brief → due diligence → outreach**. The system should never write copy before resolving the target.

## Commands

```bash
npm install --no-fund --no-audit --prefer-offline
npm run dev          # Vite dev server on http://localhost:3000
npm run build        # Production build to dist/
npm run lint         # TypeScript type-check only (tsc --noEmit)
npm run preview      # Preview production build on port 4173
```

There is no test runner configured yet. `lint` is the only check.

## Tech stack

- React 19 + TypeScript (strict mode) + Vite 7
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (not PostCSS config — uses `@theme` in `src/index.css`)
- React Router DOM v7 (BrowserRouter)
- UI primitives: Radix Slot, class-variance-authority (cva), clsx + tailwind-merge (`cn()` helper)
- Icons: lucide-react
- Path alias: `@/` → `./src/` (configured in both `vite.config.ts` and `tsconfig.json`)

## Architecture

### Two routes only

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Landing` | Marketing page with console preview |
| `/console` | `Console` | The actual product: intake form + research board + outreach studio |

### State management

All app state lives in `src/store/AppContext.tsx` via React Context (`useApp()` hook). State includes:
- `requests: DiligenceRequest[]` — persisted to `localStorage` key `ddbye-front`
- `draft: RequestInput` — the current intake form
- `selectedId` — which request is shown in the detail view
- Example loaders (`loadExample('pg' | 'a16z')`) and `submitDraft()` which creates a simulated request

### Simulation layer

`src/logic/mockAgent.ts` handles the front-only simulation:
- `createSimulatedRequest()` — pattern-matches the brief text to pick a seeded case (PG/HN or a16z) or builds a generic case
- `advanceRun()` — steps through the 5-stage pipeline (parse → resolve → research → synthesize → draft)
- Progress is driven by `setTimeout` timers in `AppContext.scheduleProgress()` (1.1s → 2.3s → 3.6s → 5s)

### Type system

`src/types.ts` defines the entire domain model: `DiligenceRequest`, `RequestInput`, `ResearchPacket`, `OutreachPacket`, `EvidenceItem`, `RunStage`, etc. These types are the contract between frontend and the future backend.

### Seeded data

`src/data/sampleCases.ts` contains two fully-populated `DiligenceRequest` objects (PG/Hacker News and a16z/Andreessen) that demonstrate the complete output shape. These are loaded as defaults and used as templates when the mock agent recognizes a matching brief.

## Design system

- Two font families: `font-sans` (Inter) and `font-rounded` (Manrope) — defined in `@theme` block
- Brand palette: `brand-lavender-*` and `brand-blue-*` with custom `neutral-*` scale
- Heavy use of large border-radius (`rounded-[24px]`, `rounded-[28px]`) and glassmorphism (`bg-white/85 backdrop-blur`)
- Reusable components: `SectionCard` (titled card with optional action slot), plus `src/components/ui/` (Button, Badge, Card, Table, Input, Textarea)
- Button/Badge variants use `cva` pattern (class-variance-authority)

## Future backend plan (docs only, no code)

The production plan uses **Claude Agent SDK** with **WebSearch** and **WebFetch** server tools. Key docs:
- `docs/04_agent-plan-claude-sdk.md` — worker pipeline (parse → resolve → research → synthesize → draft → quality gate)
- `docs/05_api-worker-contracts.md` — API endpoints (`POST /requests`, `GET /requests/:id`) and SSE event model
- `contracts/` — example JSON payloads for request creation, research packets, and outreach packets

Evidence provenance is first-class: every item must be labeled `User brief`, `Public web`, or `Inference`.

## Key conventions

- Korean and English are mixed in sample briefs and intake copy — this is intentional (bilingual user)
- The `cn()` utility (`src/lib/utils.ts`) is the standard way to merge Tailwind classes
- No ESLint or Prettier configured — only `tsc --noEmit` for checking
- The `index.html` title is "DDBye"
