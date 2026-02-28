# Quality Bar

Minimum quality standards for shipping code.

## Standards

- TypeScript strict mode, no `any` unless justified
- All evidence items must have provenance labels
- `npm run lint` (tsc --noEmit) must pass
- No regressions in existing demo flow
- Mock mode must continue working without a server
