# Plan

## Task T1: Make inferHints() extract from brief dynamically
- [x] Replace the `if (!hints.length) hints.push('Unresolved target')` fallback
- [x] Use `extractPerson()` to get a person name from the brief
- [x] Add goal type as a hint
- [x] Verify with `npm run lint`
- [x] Write minimal test

## Definition of done
- No "Unresolved target" appears for any brief input
- Lint passes
- Checker accepts
