# Research

## Topics investigated
- `@anthropic-ai/claude-agent-sdk` installation and `query()` function API
- `allowedTools` configuration for `WebSearch` and `WebFetch` server tools
- Structured output with `outputFormat` / JSON schema in the Agent SDK
- `systemPrompt` configuration for custom agent behavior
- Message stream handling — filtering for result messages with `structured_output`
- `permissionMode` selection for a headless research worker
- `package.json` dependencies for the `worker/` package
- WebSearch tool parameters (`max_uses`, `allowed_domains`, domain filter gotchas)
- WebFetch tool parameters (`max_uses`, `allowed_domains`, `max_content_tokens`, URL security rules)
- Tool versioning: `web_search_20260209` vs `web_search_20250305`

---

## Findings

### 1. `query()` — Import and basic usage

**Source:** https://platform.claude.com/docs/en/agent-sdk/typescript

The package exports a single primary function:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Research Anthropic and return key information",
  options: {
    allowedTools: ["WebSearch", "WebFetch"],
    permissionMode: "bypassPermissions",
    systemPrompt: "You are a research worker..."
  }
})) {
  if (message.type === "result" && message.structured_output) {
    // handle final structured result
  }
}
```

`query()` returns an async generator (`AsyncGenerator<SDKMessage, void>`). You must iterate it with `for await` to drive the agent loop and receive result messages. The loop ends when Claude finishes the task.

**Actionable for this task:** Each of the 6 pipeline steps (parse → resolve → research → synthesize → draft → quality gate) should be a separate `for await` loop with its own `prompt`, `outputFormat`, and `systemPrompt`.

---

### 2. `allowedTools` — WebSearch and WebFetch

**Source:** https://platform.claude.com/docs/en/agent-sdk/overview, https://platform.claude.com/docs/en/agent-sdk/typescript

Both tools are listed as built-in server tools in the Agent SDK and are passed by string name:

```typescript
options: {
  allowedTools: ["WebSearch", "WebFetch"]
}
```

These are server-side tools that Anthropic executes; no client-side implementation is required. The SDK handles the tool execution loop internally.

**Actionable for this task:**
- Steps 1 (parse) and 4 (synthesize) do not need web tools — use `allowedTools: []` or omit for those steps.
- Steps 2 (resolve) and 3 (research) need both: `allowedTools: ["WebSearch", "WebFetch"]`.
- Step 5 (draft) needs no web tools.
- Step 6 (quality gate) needs no web tools.

---

### 3. WebSearch tool — Parameters and versioning

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

The web search tool has two versions:
- `web_search_20260209` — latest, supports dynamic filtering on Opus 4.6 and Sonnet 4.6 (requires code execution tool to be co-enabled)
- `web_search_20250305` — previous version, works without dynamic filtering

When using the Agent SDK with `allowedTools: ["WebSearch"]`, the SDK wires the tool internally. If you need fine-grained tool parameters (e.g., `max_uses`, `allowed_domains`), you may need to configure them via options specific to the SDK rather than the raw API tool definition.

**Key WebSearch tool parameters (when configuring at the API level):**
```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 5,
  "allowed_domains": ["linkedin.com", "twitter.com"],
  "blocked_domains": [],
  "user_location": { "type": "approximate", "city": "San Francisco", "country": "US" }
}
```

**Important constraints:**
- Cannot use `allowed_domains` and `blocked_domains` in the same request.
- Domain filters do not support `*.example.com` wildcard prefix — only `example.com/*` path wildcard.
- Each web search costs $10 per 1,000 searches billed separately from token costs.
- If `max_uses` exceeded, the tool returns an `error_code: "max_uses_exceeded"` result (not a thrown exception).

**Actionable for this task:** For the research worker, do not restrict `allowed_domains` — the targets can be anywhere on the web. Set `max_uses` to a reasonable cap (e.g., 10) to prevent runaway cost on the research step.

---

### 4. WebFetch tool — Parameters and security rules

**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool

**Critical security constraint:** The web fetch tool can ONLY fetch URLs that have previously appeared in the conversation context. Claude cannot generate arbitrary URLs to fetch. This means:
- WebFetch works naturally after WebSearch (search results provide URLs).
- You cannot prompt Claude to "fetch https://some-url.com" from a hardcoded prompt unless that URL appeared earlier in context.

**Key WebFetch tool parameters:**
```json
{
  "type": "web_fetch_20250910",
  "name": "web_fetch",
  "max_uses": 10,
  "max_content_tokens": 50000,
  "citations": { "enabled": true }
}
```

**Content type support:** Only `text/html` and `application/pdf`. JavaScript-rendered SPAs are not supported — fetched HTML is the static DOM only.

**Pricing:** WebFetch has no additional charge beyond standard token costs. A typical web page costs ~2,500 input tokens; a large docs page ~25,000 tokens; a PDF can cost ~125,000 tokens.

**Actionable for this task:** Set `max_content_tokens: 50000` per fetch to prevent a single large page from consuming the entire context budget. Use `citations: { enabled: true }` so fetched content produces evidence items with source URLs automatically.

---

### 5. Structured output with `outputFormat`

**Source:** https://platform.claude.com/docs/en/agent-sdk/structured-outputs

The `outputFormat` option accepts a JSON Schema to constrain the final result message:

```typescript
import { z } from "zod";
import { query } from "@anthropic-ai/claude-agent-sdk";

const ParsedJobSchema = z.object({
  targetHypothesis: z.string(),
  senderObjective: z.string(),
  senderOffer: z.string(),
  preferredChannel: z.enum(["email", "linkedin", "x_dm"]),
  focusAreas: z.array(z.string())
});

const schema = z.toJSONSchema(ParsedJobSchema);

for await (const message of query({
  prompt: "Parse this intake form into a structured job...",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: schema
    }
  }
})) {
  if (message.type === "result" && message.subtype === "success" && message.structured_output) {
    const parsed = ParsedJobSchema.safeParse(message.structured_output);
    if (parsed.success) {
      const job = parsed.data; // fully typed
    }
  }
}
```

**Error handling:** When the agent cannot produce valid JSON matching the schema after retries, `message.subtype` will be `"error_max_structured_output_retries"`. Always check `subtype` before reading `structured_output`.

**Supported JSON Schema features:** all basic types, `enum`, `const`, `required`, nested objects, arrays, `$ref` definitions.

**Actionable for this task:**
- Use Zod to define schemas for each step's output type — gives compile-time types and runtime validation.
- Each of the 6 pipeline steps should have its own narrow schema. Avoid one giant schema for the full `DiligenceRequest` — break it into step-specific schemas.
- Mark fields optional if Claude may not always have the information (e.g., `unresolvedQuestions` in step 2).
- Use `z.toJSONSchema()` to convert Zod → JSON Schema for the `outputFormat` option.

---

### 6. `systemPrompt` — Custom agent behavior

**Source:** https://platform.claude.com/docs/en/agent-sdk/quickstart, https://platform.claude.com/docs/en/agent-sdk/typescript

The `systemPrompt` option replaces Claude's default system prompt for the query:

```typescript
options: {
  systemPrompt: "You are a sales research specialist. Your job is to resolve fuzzy target descriptions into specific people, organizations, and pitchable surfaces. Never treat the user's brief as verified fact. Always cite your sources.",
  allowedTools: ["WebSearch", "WebFetch"],
  permissionMode: "bypassPermissions"
}
```

**Important:** Each `query()` call can have its own `systemPrompt`. This is useful for the 6-step pipeline since each step has a different persona and safety contract:
- Parse step: "You are a structured-output extractor."
- Resolve step: "You are a target identification specialist. Never infer organization from name alone."
- Research step: "You are a web researcher. Cite every claim with a URL."
- Quality gate step: "You are a copy auditor. Flag overclaiming, fake familiarity, and unsupported assertions."

**Actionable for this task:** Write a dedicated `systemPrompt` string for each of the 6 steps. Store them as constants in a `worker/src/prompts.ts` file.

---

### 7. Filtering the message stream for results

**Source:** https://platform.claude.com/docs/en/agent-sdk/typescript, https://platform.claude.com/docs/en/agent-sdk/quickstart

The message stream emits several message types as the agent works:

| `message.type` | When emitted |
|---|---|
| `"system"` with `subtype: "init"` | Session initialized — contains `session_id` |
| `"assistant"` | Claude's reasoning text and tool call blocks |
| `"result"` with `subtype: "success"` | Final result — contains `result` (text) and optionally `structured_output` |
| `"result"` with `subtype: "error_*"` | Agent failed |

**Pattern for extracting structured output:**

```typescript
async function runStep<T>(
  prompt: string,
  schema: Record<string, unknown>,
  systemPrompt: string,
  tools: string[] = []
): Promise<T> {
  for await (const message of query({
    prompt,
    options: {
      systemPrompt,
      allowedTools: tools,
      permissionMode: "bypassPermissions",
      outputFormat: { type: "json_schema", schema }
    }
  })) {
    if (message.type === "result") {
      if (message.subtype === "success" && message.structured_output) {
        return message.structured_output as T;
      }
      throw new Error(`Agent step failed: ${message.subtype}`);
    }
  }
  throw new Error("Agent loop ended without result message");
}
```

**Actionable for this task:** Wrap every pipeline step in a helper like `runStep<T>()` above. Throw on error subtypes rather than silently returning undefined.

---

### 8. `permissionMode` for a headless research worker

**Source:** https://platform.claude.com/docs/en/agent-sdk/permissions

Available modes:

| Mode | Auto-approves | Use case |
|---|---|---|
| `default` | Nothing — needs `canUseTool` callback | Interactive UI |
| `acceptEdits` | File edits and filesystem operations | Dev workflows |
| `bypassPermissions` | All tools | CI/CD, headless workers |
| `plan` | Nothing — no tool execution | Dry run |

**For the research worker:** Use `bypassPermissions`. The worker runs headlessly in a server context, only uses `WebSearch` and `WebFetch` (no file edits), and should not pause to prompt for approval.

**Warning from docs:** `bypassPermissions` grants full autonomous system access. Since this worker only has `WebSearch` and `WebFetch` in `allowedTools`, the blast radius is limited — Claude cannot read or write files even with `bypassPermissions` if those tools are not in `allowedTools`.

**Actionable for this task:** Set `permissionMode: "bypassPermissions"` in every `query()` call inside the worker.

---

### 9. `package.json` dependencies for `worker/`

**Source:** https://platform.claude.com/docs/en/agent-sdk/typescript, https://platform.claude.com/docs/en/agent-sdk/quickstart

Minimum dependencies for the worker package:

```json
{
  "name": "ddbye-worker",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "latest",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

Notes:
- `zod` is needed for `z.toJSONSchema()` to convert schemas for `outputFormat`.
- `tsx` enables running TypeScript files directly in Node.js without a separate compile step (useful for dev/test).
- The package should use `"type": "module"` and target `"ESNext"` / `"NodeNext"` in `tsconfig.json`.

---

### 10. Known gotchas and limitations

**Source:** docs above + WebSearch

1. **WebFetch cannot fetch arbitrary URLs.** Claude can only fetch URLs that appeared previously in conversation context (user messages, prior search results, or prior fetch results). This means the typical usage is: WebSearch first → get URLs in results → WebFetch those specific URLs. Do not try to tell Claude to fetch a hardcoded URL via the system prompt.

2. **No `outputFormat` + streaming mixed result.** The `structured_output` field only appears on the terminal `"result"` message. Intermediate assistant messages contain reasoning text, not structured data. Do not try to parse intermediate messages as JSON.

3. **Schema complexity increases retry risk.** Deeply nested schemas with many `required` fields are harder for the agent to satisfy. If the agent cannot produce valid JSON after retries, the result subtype is `"error_max_structured_output_retries"`. Keep schemas focused — separate the `ResearchPacket` and `OutreachPacket` into distinct `query()` calls with their own schemas.

4. **`ANTHROPIC_API_KEY` must be set.** The SDK reads this env var automatically. If not set, `query()` throws on first use. Validate the env var at worker startup.

5. **WebSearch is not free.** Each search costs $10 per 1,000 uses ($0.01/search). The research step may do 5–10 searches per run. Budget accordingly and set `max_uses` to cap per-run cost.

6. **WebFetch does not support JS-rendered pages.** LinkedIn profile pages, Twitter/X timelines, and most modern SPAs will return minimal or empty HTML. The worker's research for social profiles must rely on search results rather than direct fetches.

7. **Dynamic filtering needs code execution tool.** The newer `web_search_20260209` and `web_fetch_20260209` tool versions (which reduce token usage via dynamic filtering) require the code execution tool to be co-enabled. When using the Agent SDK with `allowedTools: ["WebSearch", "WebFetch"]`, stick to the stable versions unless you explicitly enable code execution.

8. **V2 preview interface.** The docs mention a new V2 interface with `send()` and `stream()` patterns. This is preview-only. Do not use it — stick with `query()` for stability.

9. **Session resumption is available** via `options.resume: sessionId`. The session ID is emitted in the `system`/`init` message. For a multi-step pipeline where each step is a separate `query()` call, you do NOT need to resume — each step starts fresh with a self-contained prompt. Only use `resume` if you want the next step to have context from the previous agent loop (generally not needed here since you extract structured output and pass it forward explicitly).

10. **`allowedTools: []` is valid** for steps that need no web access (parse, synthesize, draft, quality gate). This prevents Claude from making unnecessary web calls and speeds up those steps.

---

## Pitfalls to avoid

- Do not call `query()` with a single massive prompt for all 6 steps — the context window and token cost explode. Each step must be its own `query()` call.
- Do not rely on `message.result` (the text string) for programmatic output — always use `message.structured_output` with a schema.
- Do not use `allowedTools: ["Read", "Edit", "Write", "Bash"]` in the research worker — it has no business touching the filesystem.
- Do not pass the frontend's `src/types.ts` types directly to the worker — the worker should have its own copy to avoid cross-package import coupling.
- Do not set `max_content_tokens` too high on WebFetch — fetching a large PDF on every run can add 100k+ input tokens per step.
- Do not skip `subtype` check on result messages — assume `structured_output` is always present only when `subtype === "success"`.
- Do not hardcode target URLs in the system prompt for WebFetch — they must appear in context first (via search results or user messages).

---

## Recommended patterns

### Step isolation pattern
```typescript
// Each step is a self-contained async function
async function stepParse(input: RequestInput): Promise<ParsedJob> {
  return runStep<ParsedJob>(
    buildParsePrompt(input),
    parsedJobSchema,
    PARSE_SYSTEM_PROMPT,
    [] // no web tools for parse step
  );
}

async function stepResolve(job: ParsedJob): Promise<ResolvedTarget> {
  return runStep<ResolvedTarget>(
    buildResolvePrompt(job),
    resolvedTargetSchema,
    RESOLVE_SYSTEM_PROMPT,
    ["WebSearch", "WebFetch"]
  );
}
```

### Progress callback emission pattern
```typescript
async function runDiligence(
  input: RequestInput,
  onProgress: (stage: string, detail: string) => void
): Promise<{ research: ResearchPacket; outreach: OutreachPacket }> {
  onProgress("parse", "Parsing intake...");
  const job = await stepParse(input);

  onProgress("resolve", "Resolving target...");
  const target = await stepResolve(job);

  onProgress("research", "Researching target...");
  const context = await stepResearch(job, target);

  onProgress("synthesize", "Synthesizing angle...");
  const research = await stepSynthesize(job, target, context);

  onProgress("draft", "Drafting outreach...");
  let outreach = await stepDraft(job, research);

  onProgress("draft", "Running quality gate...");
  outreach = await stepQualityGate(research, outreach);

  return { research, outreach };
}
```

### Zod schema → `outputFormat` pattern
```typescript
import { z } from "zod";

const EvidenceItemSchema = z.object({
  id: z.string(),
  claim: z.string(),
  sourceType: z.enum(["User brief", "Public web", "Inference"]),
  sourceLabel: z.string(),
  confidence: z.enum(["High", "Medium"]),
  usedFor: z.string()
});

const schema = z.toJSONSchema(EvidenceItemSchema);

// Pass to query:
options: {
  outputFormat: { type: "json_schema", schema }
}
```

---

## References

- https://platform.claude.com/docs/en/agent-sdk/overview — Agent SDK overview and built-in tools list
- https://platform.claude.com/docs/en/agent-sdk/typescript — Full TypeScript API reference: `query()`, `Options`, `SDKMessage` types
- https://platform.claude.com/docs/en/agent-sdk/quickstart — Working TypeScript example with `allowedTools`, `permissionMode`, `systemPrompt`
- https://platform.claude.com/docs/en/agent-sdk/structured-outputs — `outputFormat` option, Zod integration, error subtypes, schema limitations
- https://platform.claude.com/docs/en/agent-sdk/permissions — All `permissionMode` values and their behavior
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool — WebSearch parameters, versioning, pricing ($10/1k searches), error codes
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool — WebFetch parameters, URL security model, JS-SPA limitation, pricing (no extra charge)
