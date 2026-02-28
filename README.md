# Outreach OS - front-only reset

This package is a **frontend-first reset** of the outreach product.

It intentionally does **not** ship backend code. The point of this package is:

1. Fix the UX around intake and output.
2. Show a clean landing + console flow.
3. Define the API and worker shape in documents only.
4. Clarify how the research agent should work before anyone writes server code.

## What changed

The old direction had two major problems:

- It exposed internal objects like campaigns and prospects too early.
- It wrote copy before it justified the target, the surface, and the wedge.

This reset changes the user-facing workflow to:

**messy brief -> due diligence -> outreach**

## What is in this package

- `src/` - runnable frontend prototype
- `docs/` - service, UX, agent, and API/worker planning docs
- `server/README.md` - backend shape only, no implementation
- `worker/README.md` - worker shape only, no implementation
- `contracts/` - JSON contract examples for future backend work

## Run locally

```bash
npm install --no-fund --no-audit --prefer-offline
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build check

```bash
npm run lint
npm run build
```

Both commands were used before packaging this archive.

## Notes

- This is a **front-only prototype**.
- The "agent run" shown in the console is simulated in the frontend.
- The seeded examples are illustrative and are there to make the UX and output shape concrete.
- The production plan assumes **Claude Agent SDK** with **WebSearch** and **WebFetch** as the research tools, but that is documented only in `docs/04_agent-plan-claude-sdk.md`.
