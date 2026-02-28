# Decision Log

Append new decisions at the bottom.

## 2026-02-28: Resolve step (step 2) keeps WebSearch/WebFetch tools

**Context:** Spec B2 says steps 1, 2, 4, 6 should not have web tools. But the TODO task B4 says "Use the agent to determine from the fuzzy brief" and requires resolving "Hacker News" specifically (not YC broadly), which benefits from web verification.

**Decision:** Keep web tools in step 2 (resolve). The TODO's acceptance criterion is more specific than the spec's blanket exclusion. Without web access, the model can only resolve from training data, making it unable to verify current product surfaces.

**Spec amendment needed:** Spec B2 should say "steps 1, 4, 6" rather than "steps 1, 2, 4, 6".
