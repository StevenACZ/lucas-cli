import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resolveSubscriptionId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const getSubscriptionCommand = new Command("get")
  .description("Get one subscription (active or paused)")
  .argument("<subscription>", "Subscription name or id")
  .action(async (ref: string) => {
    const id = await resolveSubscriptionId(ref);
    const data = await apiRequest(
      "GET",
      resourcePath("/api/subscriptions", id),
    );
    output.success(stripHeavy(data));
  });
