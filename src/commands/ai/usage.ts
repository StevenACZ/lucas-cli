import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface AIUsageOptions {
  type?: string;
}

export async function runAIUsage(opts: AIUsageOptions) {
  const query = opts.type ? { type: opts.type } : undefined;
  const data = await apiRequest("GET", "/api/ai/usage", undefined, query);
  output.success(data);
}

export const aiUsageCommand = new Command("usage")
  .description("Show AI usage and limits")
  .option("--type <type>", "Usage type filter, for example chat")
  .action(runAIUsage);
