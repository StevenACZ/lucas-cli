import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const aiInsightsCommand = new Command("insights").description(
  "Persisted AI financial insight",
);

aiInsightsCommand
  .command("get")
  .description("Show the stored AI financial insight (null when none exists)")
  .action(async () => {
    const data = await apiRequest("GET", "/api/ai/insights");
    output.success(data);
  });

aiInsightsCommand
  .command("generate")
  .description(
    "Regenerate and replace the stored insight (consumes one AI usage call)",
  )
  .option("--period <period>", "Analysis period: WEEK | MONTH", "MONTH")
  .action(async (opts) => {
    const body: Record<string, unknown> = {};
    if (opts.period) body.period = String(opts.period).toUpperCase();
    const data = await apiRequest("POST", "/api/ai/insights/generate", body);
    output.success(data);
  });
