# T4: Detailed Run States + Delete — Implementer Report

## Changes

1. `src/pages/Console.tsx`: Left rail badge now shows the active `RunStage.label` (e.g. "Parsing brief") instead of just "running" — falls back to "queued" when no stage is running yet
2. `src/store/AppContext.tsx`: Added `deleteRequest(id)` — removes from array, advances selection to next/previous, or clears to empty state
3. `src/pages/Console.tsx`: Added hover-revealed Trash2 button with `group/group-hover:opacity-100` pattern, with `stopPropagation` to prevent card selection
4. Request cards wrapped in `div.group.relative` to support the hover reveal
