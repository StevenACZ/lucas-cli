import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface AIInsightsOptions {
  period?: string;
  currency?: string;
}

export async function runInsights(query: string, opts: AIInsightsOptions) {
  const body: Record<string, unknown> = { query };
  if (opts.period) body.period = opts.period;
  if (opts.currency) body.currency = opts.currency;

  const data = await apiRequest("POST", "/api/ai/insights", body);
  output.success(data);
}

export const aiInsightsCommand = new Command("insights")
  .description("Ask LucasApp AI for financial insights")
  .argument("<query...>", "Insight prompt")
  .option("--period <period>", "Analysis period, for example month")
  .option("--currency <currency>", "Preferred currency")
  .action(async (queryParts: string[], opts: AIInsightsOptions) => {
    const query = queryParts.join(" ").trim();
    if (!query) {
      output.error("Query is required");
    }

    await runInsights(query, opts);
  });
