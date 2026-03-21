import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const deleteSubscriptionCommand = new Command("delete")
  .description("Delete a subscription")
  .argument("<id>", "Subscription ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", `/api/subscriptions/${id}`);
    output.success(data);
  });
