import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import { AgentQueryError, WorkerConfigError } from "./errors.js";

export function validateApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new WorkerConfigError(
      "ANTHROPIC_API_KEY environment variable is required but not set"
    );
  }
}

export interface StepOptions {
  prompt: string;
  systemPrompt: string;
  schema: z.ZodType;
  allowedTools?: string[];
}

export async function runStep<T>(options: StepOptions): Promise<T> {
  const { prompt, systemPrompt, schema, allowedTools = [] } = options;

  const jsonSchema = z.toJSONSchema(schema);

  try {
    for await (const message of query({
      prompt,
      options: {
        systemPrompt,
        allowedTools,
        // Required for headless worker operation. The allowedTools array
        // constrains actual tool access (WebSearch/WebFetch only for research steps,
        // empty for reasoning-only steps). The permission bypass only removes
        // interactive approval prompts, not the tool allowlist.
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        outputFormat: {
          type: "json_schema",
          schema: jsonSchema,
        },
      },
    })) {
      if (message.type === "result") {
        if (
          message.subtype === "success" &&
          message.structured_output != null
        ) {
          const parsed = schema.safeParse(message.structured_output);
          if (parsed.success) {
            return parsed.data as T;
          }
          throw new AgentQueryError(
            `Structured output failed validation: ${parsed.error.message}`,
            { cause: parsed.error }
          );
        }
        throw new AgentQueryError(
          `Agent step failed with subtype: ${message.subtype}`
        );
      }
    }
  } catch (error) {
    if (
      error instanceof AgentQueryError ||
      error instanceof WorkerConfigError
    ) {
      throw error;
    }
    throw new AgentQueryError("Agent query failed", { cause: error });
  }

  throw new AgentQueryError("Agent loop ended without a result message");
}
