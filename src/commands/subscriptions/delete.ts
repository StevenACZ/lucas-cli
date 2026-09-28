import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { requireYes } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { resolveSubscriptionId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const deleteSubscriptionCommand = new Command("delete")
  .description("Delete a subscription (permanent)")
  .argument("<subscription>", "Exact subscription name or id")
  .option("--yes", "Confirm the permanent deletion")
  .action(async (ref: string, opts: { yes?: boolean }) => {
    requireYes(opts.yes, "Deleting a subscription");
    const id = await resolveSubscriptionId(ref, { exact: true });
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/subscriptions", id),
    );
    output.success(stripHeavy(data));
  });
