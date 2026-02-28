# DDBye

**Due diligence first. Outreach second.**

[ddbye.com](https://ddbye.com)

DDBye turns a messy target brief into defensible, evidence-backed outreach in under 60 seconds. No more "I've been following your work" cold emails. Every claim traces to a source. Every angle is grounded in real research.

```mermaid
flowchart LR
    A["Messy brief\n'PG, famous for YC —\nwant to explore doing\nbusiness with Hacker News'"] --> B["Parse"]
    B --> C["Resolve"]
    C --> D["Research"]
    D --> E["Synthesize"]
    E --> F["Draft"]
    F --> G["Quality Gate"]
    G --> H["Outreach Pack\nEmail + LinkedIn + X DM\nwith evidence provenance"]

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

If the quality gate catches violations, it automatically re-drafts with corrections. One retry, no loops.

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

## Built With

Built at the 2026 Portland Hackathon using [Claude Code](https://claude.ai/code) as the primary development tool.

---

*See [README.dev.md](README.dev.md) for developer setup, testing instructions, and project structure details.*
