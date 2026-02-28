# Worker placeholder

No worker code is intentionally included in this package.

This directory exists only to define the future worker boundary.

The future worker should:

- run the Claude Agent SDK
- use Claude WebSearch and WebFetch tools
- resolve target -> research context -> synthesize wedge -> draft outreach
- return structured research and outreach packets
- label evidence provenance

See `docs/04_agent-plan-claude-sdk.md` and `docs/05_api-worker-contracts.md`.
