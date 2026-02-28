#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runDiligence } from "./index.js";
import type { RequestInput, ProgressEvent } from "./types.js";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npx tsx src/cli.ts <input.json>");
    console.error("  input.json must be a valid RequestInput JSON file");
    process.exit(1);
  }

  let input: RequestInput;
  try {
    const raw = readFileSync(inputPath, "utf-8");
    input = JSON.parse(raw) as RequestInput;
  } catch (err) {
    console.error(`Failed to read input file: ${inputPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const onProgress = (event: ProgressEvent): void => {
    const detail = event.detail ? ` — ${event.detail}` : "";
    console.error(`[${event.stage}] ${event.status}${detail}`);
  };

  try {
    const result = await runDiligence(input, onProgress);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("\nPipeline failed:");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
