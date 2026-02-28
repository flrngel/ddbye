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
  /** Which built-in tools the model can use. Empty array disables all tools. */
  tools?: string[];
}

export async function runStep<T>(options: StepOptions): Promise<T> {
  const { prompt, systemPrompt, schema, tools = [] } = options;

  // Generate JSON schema and strip $schema annotation — the SDK rejects
  // schemas with $schema and silently falls back to text output.
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];

  try {
    for await (const message of query({
      prompt,
      options: {
        systemPrompt,
        // `tools` controls which built-in tools are available to the model.
        // Empty array disables all tools. ["WebSearch", "WebFetch"] for web steps.
        tools,
        // Required for headless worker operation — removes interactive
        // approval prompts without affecting the tools allowlist.
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        outputFormat: {
          type: "json_schema",
          schema: jsonSchema,
        },
      },
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          if (message.structured_output != null) {
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
            "Agent returned success but structured_output is empty. " +
              "The JSON schema may be incompatible with the SDK."
          );
        }
        // Handle specific error subtypes for better diagnostics
        const errors =
          "errors" in message ? (message.errors as string[]).join("; ") : "";
        throw new AgentQueryError(
          `Agent step failed (${message.subtype}): ${errors}`
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
