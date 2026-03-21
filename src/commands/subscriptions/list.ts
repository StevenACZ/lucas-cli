import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listSubscriptionsCommand = new Command("list")
  .description("List all subscriptions")
  .action(async () => {
    const data = await apiRequest("GET", "/api/subscriptions");
    output.success(data);
  });
