# Status

Last updated: 2026-02-28

## Done

### Service definition (doc 01)
- [x] Product type defined: messy brief → due diligence → outreach
- [x] Core promise clear: resolve target, expand context, map objective, write deliverable
- [x] Primary user identified (founder, senior sales operator)
- [x] Non-goals stated (no CRM, no bulk sequencing, no generic AI copywriting)
- [x] User-facing object is a **request**, not campaigns/prospects

### UX reset (doc 02)
- [x] Two pages only: Landing and Console
- [x] Landing explains the product, shows console preview, links to console
- [x] Console has left rail (saved requests), top composer (brief input), main workspace (research + outreach)
- [x] Intake is one brief composer with all four essentials (target, objective, offer, deliverable)
- [x] Old campaign/prospect/strategy-toggle UI is gone
- [x] Output order in workspace: resolved target → why this target → context cards → recommended wedge → evidence → subject + draft
- [x] Design system implemented: pastel lavender + blue, soft white surfaces, rounded components, Manrope headings, Inter body

### Console page spec (doc 03)
- [x] Left rail: request cards with title, parsed hints, channel, status, updated time
- [x] Composer fields: target brief, objective, offer, deliverable (channel), goal type, tone, research focus chips
- [x] Research board sections: resolved target (person/org/surface cards), parsed hints, why this target, agent run stages, context cards, recommended wedge (headline + rationale + mention/avoid), evidence with provenance labels
- [x] Outreach studio: channel tabs (email/LinkedIn/X DM), subject lines (email only, visible above body), final draft (readable + copyable), follow-up message
- [x] Copy buttons on subject lines, draft, and follow-up

### Agent plan (doc 04)
- [x] 5-stage pipeline defined: parse → resolve → research → synthesize → draft
- [x] Quality gate rules documented (overclaiming, fake familiarity, insulting target, unsupported assertions)
- [x] Two structured packets defined: ResearchPacket and OutreachPacket
- [x] Evidence provenance labels: User brief, Public web, Inference
- [x] Claude Agent SDK + WebSearch + WebFetch chosen as the runtime (documented, not implemented)

### API/worker contracts (doc 05)
- [x] Request lifecycle states documented (queued → parsing → ... → ready/failed)
- [x] API surface defined: POST /requests, GET /requests, GET /requests/:id, POST /requests/:id/redraft
- [x] SSE event model defined
- [x] Data ownership split: API (persistence/dispatch), Worker (agent execution), Frontend (UX/rendering)
- [x] Example JSON contracts in `contracts/` directory

### Demo flow (doc 06)
- [x] PG/Hacker News seeded case fully populated with research + outreach
- [x] a16z/Andreessen seeded case fully populated
- [x] "Load PG example" and "Load a16z example" buttons in composer
- [x] Run simulation with visible stage progression (parse → resolve → research → synthesize → draft)
- [x] Generic case fallback when brief doesn't match seeded patterns

### Frontend implementation
- [x] Type system (`src/types.ts`) covers the full domain model
- [x] Mock agent (`src/logic/mockAgent.ts`) simulates the pipeline with timers
- [x] State management via React Context with localStorage persistence
- [x] UI component library: Button, Badge, Card, Table, Input, Textarea, SectionCard
- [x] Responsive layout (mobile sidebar collapses to top)

---

## To do

### Backend: API server (`server/`)
- [ ] Set up Node/Express (or equivalent) server
- [ ] Implement `POST /requests` — accept intake, persist, dispatch worker
- [ ] Implement `GET /requests` — return request summaries for left rail
- [ ] Implement `GET /requests/:id` — return full request with research + outreach
- [ ] Implement `POST /requests/:id/redraft` — re-run draft with changed tone/channel
- [ ] Request persistence (database choice TBD)
- [ ] SSE endpoint for streaming worker progress events to frontend

### Backend: Research worker (`worker/`)
- [ ] Integrate Claude Agent SDK
- [ ] Configure WebSearch and WebFetch server tools
- [ ] Implement Step 1: parse intake into structured job
- [ ] Implement Step 2: resolve target (person, org, surface) from fuzzy brief
- [ ] Implement Step 3: expand context via live web research
- [ ] Implement Step 4: synthesize wedge (one clear recommendation)
- [ ] Implement Step 5: generate outreach (title, subject lines, email, DM variants, follow-up)
- [ ] Implement Step 6: quality gate (check overclaiming, fake familiarity, unsupported assertions, evidence-copy mismatch)
- [ ] Return structured ResearchPacket and OutreachPacket matching `src/types.ts`
- [ ] Label every evidence item with provenance (User brief / Public web / Inference)

### Frontend: connect to real backend
- [ ] Replace mock agent with API calls to `POST /requests`
- [ ] Replace timer-based simulation with SSE event subscription
- [ ] Replace localStorage state with API-fetched data (`GET /requests`, `GET /requests/:id`)
- [ ] Handle error/failed states (the prototype only knows `running` and `ready`)
- [ ] Add loading states for API calls

### Frontend: gaps vs spec
- [ ] Fix `index.html` title (still says "My Google AI Studio App")
- [ ] Production request lifecycle has more states (queued, parsing, resolving, researching, synthesizing, drafting, ready, failed) — frontend currently only uses running/ready
- [ ] No error handling or failed-state UI
- [ ] No redraft flow (change tone/channel after first result)
- [ ] No delete/archive for requests
- [ ] No empty state guidance when there are zero requests

### Quality and tooling
- [ ] Initialize git repository
- [ ] Set up ESLint + Prettier
- [ ] Add test runner (Vitest or similar)
- [ ] Add E2E tests (Playwright or similar) for the demo flow
- [ ] CI pipeline (lint + type-check + test + build)

### Production readiness
- [ ] Authentication / user accounts
- [ ] Rate limiting on API
- [ ] Cost controls for Claude Agent SDK usage
- [ ] Logging and monitoring
- [ ] Deploy pipeline (frontend static hosting + API server + worker)
