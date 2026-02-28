# Compound Summary

## What was learned

### From verification
- `tsc --noEmit` catches type errors but misses runtime concerns (Zod import paths, SDK config requirements, prompt injection risks).
- Zod 3.25.x ships a `zod/v4` sub-path that makes `z.toJSONSchema()` available without upgrading to Zod 4.

### From review overlap
- Security and architecture reviewers both flagged the quality gate SSE gap — but for different reasons (security: hidden retry, architecture: poor debuggability). The spec explicitly designed this behavior.
- Both reviewers noted the CLI outputs PII to stdout — acceptable for dev but needs attention before production deployment.

### From checker iteration
- The checker caught `_qualityWarnings` not being propagated — a classic "data computed but discarded" bug. The fix was trivial once identified.
- The checker caught a spec contradiction (step 2 web tools vs. spec B2 exclusion). Resolved by documenting the decision: resolve needs web access for accurate target identification.

## What should be reused next time
- The `runStep<T>()` pattern (agent.ts) — wraps any SDK query into a typed, validated step. Reusable for any Agent SDK integration.
- XML-style delimiters for user-supplied text in prompts (`<user_target_hypothesis>`, `<sender_context>`) — standard defense against prompt injection.
- Separate Zod schemas per pipeline step instead of one large schema — reduces retry failures from schema complexity.

## What to avoid
- Don't assume `permissionMode: "bypassPermissions"` works without `allowDangerouslySkipPermissions: true` — the SDK requires both.
- Don't discard intermediate results (like quality warnings) even if they're not part of the primary return type — downstream consumers need them.
- Don't include unnecessary user-controlled fields in prompts that have web tool access — minimizes injection surface area.
