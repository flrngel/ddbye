# Context

## Raw request
"Unresolved target" still shows in parsedHints for any brief that doesn't match the 3 hardcoded patterns (PG, a16z, Sam Keen). The `inferHints()` function falls back to `'Unresolved target'` when no pattern matches. Should extract person name + context from the brief dynamically instead.

## Constraints
- Hackathon prototype — speed over perfection
- Must not be hardcoded to specific names — should work for ANY brief
- Minimal test required
- Single file change: `src/logic/mockAgent.ts`
