# DDBye

**Due diligence first. Outreach second.**

[ddbye.com](https://ddbye.com)

DDBye turns a messy target brief into defensible, evidence-backed outreach in under 60 seconds. No more "I've been following your work" cold emails. Every claim traces to a source. Every angle is grounded in real research.

```mermaid
flowchart LR
    A["Messy brief\n'PG, famous for YC —\nwant to explore doing\nbusiness with Hacker News'"] --> B["1. Parse"]
    B --> C["2. Resolve"]
    C --> D["3. Research"]
    D --> E["4. Synthesize"]
    E --> F["5. Draft"]
    F --> G{"6. Quality\nGate"}
    G -- "pass" --> H["Outreach Pack\nEmail + LinkedIn + X DM\nwith evidence provenance"]
    G -- "violations found\n(auto-retry once)" --> F

    subgraph agent["Claude Agent SDK Worker"]
        B
        C
        D
        E
        F
        G
    end

    C -. "WebSearch\nWebFetch" .-> W[(Web)]
    D -. "WebSearch\nWebFetch" .-> W

    style A fill:#f3f0ff,stroke:#7c6fc4,color:#1a1a2e
    style H fill:#eef3ff,stroke:#5b8def,color:#1a1a2e
    style G fill:#fff3e0,stroke:#f57c00,color:#1a1a2e
    style agent fill:#fafafa,stroke:#d0d0d0,stroke-dasharray:5 5
    style W fill:#fff8e1,stroke:#f9a825,color:#1a1a2e
```

## The Problem

Cold outreach is broken. Founders and salespeople either:
- **Spray and pray** — generic templates that get ignored
- **Spend hours** manually researching each target before writing a single email

Both approaches fail. The first is lazy. The second doesn't scale.

## How DDBye Solves It

DDBye enforces a simple rule: **never write copy before resolving the target.** The system runs a 6-step agent pipeline that does real due diligence before drafting anything.

### The Pipeline

| Step | What it does | Tools |
|------|-------------|-------|
| **Parse** | Extracts structured intent from your messy brief | - |
| **Resolve** | Identifies the actual person, org, and pitchable surface | WebSearch, WebFetch |
| **Research** | Investigates focus areas (background, product gaps, objections) | WebSearch, WebFetch |
| **Synthesize** | Compresses research into one defensible outreach angle | - |
| **Draft** | Writes email, LinkedIn DM, and X DM — all grounded in evidence | - |
| **Quality Gate** | Audits for overclaiming, fake familiarity, and unsupported assertions | - |

If the quality gate catches violations, it loops back to the draft step with the violation list as corrections. One automatic retry — if the re-draft still has issues, it ships with warnings attached.

### What Makes It Different

- **Evidence provenance** — Every claim is labeled `Public web` (with URL), `User brief`, or `Inference`. Nothing is made up.
- **Quality gate** — Checks for 5 prohibited patterns: overclaiming, fake familiarity, target insults, unsupported assertions, evidence-copy mismatch.
- **Three channels, one angle** — Email (with subject lines), LinkedIn DM, and X DM all share the same research and angle but adapt to channel norms.
- **Tone and goal awareness** — Respects whether you're selling, fundraising, recruiting, seeking advice, or proposing a partnership.

## Demo

Try the two seeded examples in the console:

**PG / Hacker News** — Pitching a hosted search product to Paul Graham. The agent discovers HN's Algolia search limitations, identifies user complaints about single-word queries, and crafts an angle that respects Graham's minimalist philosophy.

**a16z / Andreessen** — Fundraising outreach to a16z. The agent researches their investment thesis, portfolio patterns, and finds the right entry point.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend runs standalone with simulated agent data — no API key needed for the demo.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4
- **Agent Worker**: Claude Agent SDK with WebSearch + WebFetch server tools
- **Server**: Hono + SQLite + SSE streaming
- **Quality**: Vitest, Playwright, ESLint, TypeScript strict mode

## Architecture

```
src/           React frontend — Landing page + Console (intake, research board, outreach studio)
server/        Hono API server — REST + SSE for real-time progress
worker/        Claude Agent SDK pipeline — 6-step agent with Zod-validated structured outputs
```

The worker uses the Claude Agent SDK's `query()` function with JSON Schema output format. Each step gets its own Zod schema, system prompt, and tool allowlist. Web tools are only enabled for the resolve and research steps — all other steps run with tools disabled.

## Technical Architecture

```mermaid
flowchart TB
    subgraph client["Frontend — React 19 + Vite 7 + Tailwind v4"]
        direction TB
        Landing["Landing Page<br/><i>Marketing + Preview</i>"]
        Console["Console Page<br/><i>Intake → Research Board → Outreach Studio</i>"]
        Store["AppContext<br/><i>useApp() hook + localStorage</i>"]
        Mock["Mock Agent<br/><i>Pattern-match → seeded cases<br/>setTimeout progression</i>"]
        APIClient["API Client<br/><i>REST + SSE EventSource</i>"]

        Console --> Store
        Store -- "mock mode<br/>(no VITE_API_BASE)" --> Mock
        Store -- "API mode" --> APIClient
    end

    subgraph tunnel["Cloudflare Tunnel"]
        CF["ddbye.com<br/><i>HTTPS → localhost:3333</i>"]
    end

    subgraph server["API Server — Hono + Node.js"]
        direction TB
        REST["REST API<br/><code>POST /requests</code><br/><code>GET /requests/:id</code><br/><code>POST /requests/:id/redraft</code>"]
        SSE["SSE Fan-out<br/><code>GET /requests/:id/events</code><br/><i>Named events per stage</i>"]
        DB[("SQLite + WAL<br/><i>requests table<br/>JSON blob storage</i>")]
        Dispatch["Worker Dispatch<br/><i>Stub: setTimeout chain<br/>Prod: spawn worker process</i>"]

        REST --> DB
        REST --> Dispatch
        SSE --> DB
        Dispatch --> SSE
    end

    subgraph worker["Worker — Claude Agent SDK"]
        direction LR
        Parse["Parse<br/><i>no tools</i>"]
        Resolve["Resolve<br/><i>WebSearch<br/>WebFetch</i>"]
        Research["Research<br/><i>WebSearch<br/>WebFetch</i>"]
        Synthesize["Synthesize<br/><i>no tools</i>"]
        Draft["Draft<br/><i>no tools</i>"]
        QG{"Quality<br/>Gate"}

        Parse --> Resolve --> Research --> Synthesize --> Draft --> QG
        QG -- "violations<br/>(retry once)" --> Draft
    end

    subgraph schemas["Zod-Validated Structured Output per Step"]
        direction LR
        S1["ParsedJob"]
        S2["ResolvedTarget"]
        S3["ResearchContext"]
        S4["SynthesisResult"]
        S5["OutreachPacket"]
        S6["QualityGateResult"]
    end

    CF --> client
    APIClient -- "REST + SSE" --> REST
    APIClient -- "SSE stream" --> SSE
    Dispatch -- "spawns" --> worker
    worker -- "progress events" --> SSE
    Resolve & Research -. "web tools" .-> Web[(Public Web)]

    Parse ~~~ S1
    Resolve ~~~ S2
    Research ~~~ S3
    Synthesize ~~~ S4
    Draft ~~~ S5
    QG ~~~ S6

    style client fill:#f3f0ff,stroke:#7c6fc4,color:#1a1a2e
    style server fill:#eef3ff,stroke:#5b8def,color:#1a1a2e
    style worker fill:#fff8e1,stroke:#f9a825,color:#1a1a2e
    style tunnel fill:#e8f5e9,stroke:#43a047,color:#1a1a2e
    style schemas fill:#fafafa,stroke:#d0d0d0,stroke-dasharray:5 5,color:#666
    style DB fill:#e3f2fd,stroke:#1976d2,color:#1a1a2e
    style QG fill:#fff3e0,stroke:#f57c00,color:#1a1a2e
    style Web fill:#fff8e1,stroke:#f9a825,color:#1a1a2e
    style Mock fill:#f3e5f5,stroke:#9c27b0,color:#1a1a2e
    style CF fill:#e8f5e9,stroke:#43a047,color:#1a1a2e
```

### Data Flow

**Mock mode** (demo, no server): Brief → pattern-match to seeded case → `setTimeout` chain (1.1s → 2.3s → 3.6s → 5.0s) → progressive stage updates → localStorage.

**API mode** (production): Brief → `POST /requests` → server dispatches worker → worker runs 6-step Claude Agent SDK pipeline → SSE streams named events (`request.parsing`, `request.resolved`, ...) → frontend hydrates on `request.ready`.

**Evidence provenance** is enforced end-to-end: every claim carries a `sourceType` label (`Public web` with URL, `User brief`, or `Inference`) from Zod schemas through to the rendered outreach copy.

### Type System

Three parallel type definitions kept in sync manually:

| Layer | File | `RequestStatus` |
|-------|------|-----------------|
| Frontend | `src/types.ts` | 3 states: `running · ready · failed` |
| Server | `server/src/types.ts` | 8 states: `queued · parsing · resolving · researching · synthesizing · drafting · ready · failed` |
| Worker | `worker/src/types.ts` | Pipeline-internal types + `ProgressEvent` callbacks |

## Built With

Built at the 2026 Portland Hackathon using [Claude Code](https://claude.ai/code) as the primary development tool.

---

*See [README.dev.md](README.dev.md) for developer setup, testing instructions, and project structure details.*
