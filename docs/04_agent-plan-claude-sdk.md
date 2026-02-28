# Agent plan - Claude Agent SDK only

This document defines how the future backend worker should operate.

There is **no backend implementation in this package**.

## Hard constraint

The research runtime should use:

- Claude Agent SDK
- Claude server tools for WebSearch and WebFetch

Not a custom browsing stack.

## Why

The product needs a research worker that can:

- resolve people and organizations from fuzzy user input
- search the live web for public context
- fetch pages that matter
- return structured outputs with citations / provenance

## Worker responsibilities

The worker owns the entire diligence pipeline.

### Step 1: parse the intake

Turn the brief into a structured job:

- target hypothesis
- sender objective
- sender offer
- preferred channel
- research focus

### Step 2: resolve the target

Questions:

- who is the person
- what organization or service matters
- which surface is actually pitchable

Output:

- person
- org
- surface
- unresolved questions

### Step 3: expand the context

Use web tools to research only what matters for the ask.

Examples:

- product surface and usability wedge
- investment thesis and firm fit
- recent signals
- public writing / product statements
- likely objections

### Step 4: synthesize the wedge

Convert raw research into one strong recommendation:

- why this target
- what to mention
- what to avoid
- what the lightest CTA should be

### Step 5: generate outreach

Write:

- title
- subject lines if email
- final email
- DM variants
- follow-up

### Step 6: quality gate

Every final output should be checked for:

- overclaiming
- fake familiarity
- insulting the target or their product
- unsupported assertions
- mismatch between evidence and copy

## Structured outputs required

The worker should produce two structured packets.

### Research packet

- resolved target
- why this target
- context cards
- recommended wedge
- evidence items

### Outreach packet

- email deliverable
- LinkedIn DM deliverable
- X DM deliverable

## Provenance rules

Every evidence item must be labeled as one of:

- User brief
- Public web
- Inference

The UI depends on this distinction.

## Safety and quality rules

- Never treat a fuzzy brief as proof.
- Never pitch the wrong entity if the surface is narrower than the organization.
- Never write copy before the surface is resolved.
- Never let the draft sound like generic AI flattery.
- Prefer a lightweight CTA on first contact.

## Official references

- Agent SDK overview: https://platform.claude.com/docs/en/agent-sdk/overview
- Agent SDK TypeScript reference: https://platform.claude.com/docs/en/agent-sdk/typescript
- Web search tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- Web fetch tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
