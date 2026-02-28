# Spec: Fix "Unresolved target" in parsedHints

## Problem
`inferHints()` only recognizes 3 hardcoded patterns (PG, a16z, Sam Keen). All other briefs get `'Unresolved target'` as a hint, which looks broken in the UI.

## Acceptance criteria
1. `inferHints()` extracts a person name from the brief when no hardcoded pattern matches (reuse `extractPerson()` already in the file)
2. Extracts goal type as a readable hint
3. Never shows "Unresolved target" — always shows something meaningful from the brief
4. Existing seeded cases (PG, a16z, Sam Keen) still work as before
