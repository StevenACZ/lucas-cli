import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const accountsStatsCommand = new Command("stats")
  .description(
    "Per-account monthly change, transaction count, and last movement date",
  )
  .action(async () => {
    const data = await apiRequest("GET", "/api/accounts/stats");
    output.success(data);
  });
