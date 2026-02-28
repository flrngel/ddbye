# Patterns

Append reusable patterns here.

## Claude Agent SDK: `runStep<T>()` pattern

Wrap each pipeline step as a separate `query()` call with its own system prompt, allowedTools, and Zod-validated structured output. Extract result from `message.structured_output` when `message.type === "result" && message.subtype === "success"`. See `worker/src/agent.ts`.

## Prompt injection defense: XML delimiters

Wrap user-supplied text in XML-style delimiters (`<user_target_hypothesis>`, `<sender_context>`) to help the model distinguish data from instructions. Always minimize user-controlled text in prompts that have web tool access.

## Zod schema strategy for Agent SDK

Use one narrow schema per step instead of one large schema. Complex schemas increase structured output retry failures. Use `z.toJSONSchema()` from `zod/v4` (available in zod@3.25.x via forward-compat bridge).
