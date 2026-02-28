# Track B: Research Worker

## Ownership

- **You own:** `worker/**` (all new files)
- **You may read (no edits):** `src/types.ts`, `docs/04_agent-plan-claude-sdk.md`, `contracts/`
- **Do not touch:** `src/`, `server/`, `tests/`, root config files, `index.html`

## Reference docs

- `docs/04_agent-plan-claude-sdk.md` — full agent pipeline spec, safety rules, structured output requirements
- `contracts/research-packet.example.json` — expected ResearchPacket shape
- `contracts/outreach-packet.example.json` — expected OutreachPacket shape
- `src/types.ts` — canonical type definitions

## Tasks

### B1: Init worker package
- Create `worker/package.json` and `worker/tsconfig.json`
- Install `@anthropic-ai/agent-sdk`
- The worker runs as a standalone process or function, called by the server

### B2: Agent scaffold
- Set up the Claude Agent SDK client
- Configure WebSearch and WebFetch as server tools
- Create a main `runDiligence(input: RequestInput, onProgress: callback)` entry point

### B3: Step 1 — Parse intake
- Turn `RequestInput` into a structured internal job:
  - target hypothesis (from `targetBrief`)
  - sender objective (from `objective`)
  - sender offer (from `offer`)
  - preferred channel
  - research focus areas
- Emit `parsing` → `parsed` progress event

### B4: Step 2 — Resolve target
- Use the agent to determine from the fuzzy brief:
  - **person** — who is the decision-maker
  - **organization** — what org or firm matters
  - **surface** — what specific product/service/relationship is pitchable
- Important: "pg / Hacker News" should resolve to HN as the surface, not YC broadly
- Emit `resolving` → `resolved` progress event

### B5: Step 3 — Expand context
- Use WebSearch + WebFetch to research only what matters for this ask
- Scope research to the user's selected focus areas:
  - `person_background` — career, public positions, style
  - `service_surface` — product details, gaps, insertion points
  - `investment_thesis` — firm thesis, portfolio patterns, category language
  - `recent_signals` — recent news, launches, public statements
  - `objections` — likely reasons to say no
- Build `contextCards[]` from the findings
- Emit `researching` progress event

### B6: Step 4 — Synthesize wedge
- Compress research into one `recommendedAngle`:
  - `headline` — the one-line angle
  - `rationale` — why this wedge is defensible
  - `mention[]` — what the outreach should include
  - `avoid[]` — what the outreach should not say
- Also produce `whyThisTarget[]` (max 3 bullets)
- Emit `synthesized` progress event

### B7: Step 5 — Generate outreach
- Produce three deliverables in `OutreachPacket`:
  - **email**: title, summary, subject lines (3), body, follow-up
  - **linkedin**: title, summary, body, follow-up
  - **x_dm**: title, summary, body, follow-up
- Respect the `tone` setting (respectful, direct, warm)
- Respect the `goalType` (sell, partnership, fundraise, hire, advice)
- Emit `drafted` progress event

### B8: Step 6 — Quality gate
- Before returning, check the outreach for:
  - Overclaiming (stating things not in evidence)
  - Fake familiarity ("I've been following your work closely...")
  - Insulting the target or their product
  - Unsupported assertions (claims without evidence items)
  - Mismatch between evidence and copy
- If issues found, re-run step 5 with corrections
- Emit `ready` or `failed` progress event

### B9: Structured output
- Final return must match `ResearchPacket` + `OutreachPacket` types from `src/types.ts`
- Every `EvidenceItem` must have:
  - `sourceType`: `"User brief"` | `"Public web"` | `"Inference"`
  - `sourceLabel`: human-readable label
  - `confidence`: `"High"` | `"Medium"`
  - `usedFor`: what this evidence supports

### B10: Progress callback
- Accept an `onProgress(stage, detail)` callback
- Emit events at each stage transition so the server can forward them via SSE
- Stage keys: `parse`, `resolve`, `research`, `synthesize`, `draft`
- Each event includes the stage key and a human-readable detail string

## Done criteria

- `runDiligence(input, onProgress)` can be called with a real `RequestInput`
- Given the PG/Hacker News brief, it returns a valid `ResearchPacket` with real web research
- Given the a16z brief, it returns a valid `ResearchPacket` with real web research
- Given an unknown brief, it still resolves the target and produces output
- Progress events fire at each stage
- All evidence items have provenance labels
- Quality gate catches at least one known bad pattern (test with a deliberately bad draft)

## Safety rules (from doc 04)

- Never treat a fuzzy brief as proof
- Never pitch the wrong entity if the surface is narrower than the organization
- Never write copy before the surface is resolved
- Never let the draft sound like generic AI flattery
- Prefer a lightweight CTA on first contact
