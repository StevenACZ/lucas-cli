import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const getSubscriptionCommand = new Command("get")
  .description("Get one subscription (active or paused)")
  .argument("<id>", "Subscription id")
  .action(async (id: string) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/subscriptions", id),
    );
    output.success(stripHeavy(data));
  });
