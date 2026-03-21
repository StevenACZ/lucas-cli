import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listAccountsCommand = new Command("list")
  .description("List all accounts")
  .option("--include-archived", "Include archived accounts")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.includeArchived) params.includeArchived = "true";
    const data = await apiRequest("GET", "/api/accounts", undefined, params);
    output.success(data);
  });
