import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const markPaidCommand = new Command("mark-paid")
  .description("Mark a subscription as paid")
  .argument("<id>", "Subscription ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/subscriptions", id, "mark-paid"),
    );
    output.success(data);
  });
