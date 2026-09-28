import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { stripHeavy } from "../../lib/views.js";
import { resolveSubscriptionId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";

export const markPaidCommand = new Command("mark-paid")
  .description(
    "Pay the current charge of a subscription (books an expense when it has a linked account)",
  )
  .argument("<subscription>", "Subscription name or id")
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .action(async (ref: string, opts: { dryRun?: boolean }) => {
    const id = await resolveSubscriptionId(ref);
    const path = resourcePath("/api/subscriptions", id, "mark-paid");
    if (opts.dryRun) {
      output.success({ dryRun: true, request: { method: "POST", path } });
      return;
    }
    const data = await apiRequest("POST", path);
    output.success(stripHeavy(data));
  });
