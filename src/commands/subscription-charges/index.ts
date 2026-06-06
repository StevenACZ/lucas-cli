import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface PendingChargesOptions {
  limit?: string;
  offset?: string;
}

export function buildPendingChargesParams(
  opts: PendingChargesOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const subscriptionChargesCommand = new Command(
  "subscription-charges",
).description("Manage subscription billing charges");

subscriptionChargesCommand
  .command("list")
  .description("List all generated subscription charges")
  .action(async () => {
    const data = await apiRequest("GET", "/api/subscription-charges");
    output.success(data);
  });

subscriptionChargesCommand
  .command("pending")
  .description("List pending subscription charges")
  .option("--limit <n>", "Items per page")
  .option("--offset <n>", "Pagination offset")
  .action(async (opts: PendingChargesOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/subscription-charges/pending",
      undefined,
      buildPendingChargesParams(opts),
    );
    output.success(data);
  });

subscriptionChargesCommand
  .command("by-account")
  .description("List subscription charges for an account")
  .argument("<account-id>", "Account ID")
  .action(async (accountId: string) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/subscription-charges/by-account", accountId),
    );
    output.success(data);
  });

subscriptionChargesCommand
  .command("pay")
  .description("Pay a subscription charge using its linked account")
  .argument("<charge-id>", "Subscription charge ID")
  .action(async (chargeId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/subscription-charges", chargeId, "pay"),
    );
    output.success(data);
  });

subscriptionChargesCommand
  .command("confirm")
  .description("Confirm a subscription charge transaction")
  .argument("<charge-id>", "Subscription charge ID")
  .action(async (chargeId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/subscription-charges", chargeId, "confirm"),
    );
    output.success(data);
  });

subscriptionChargesCommand
  .command("mark-paid")
  .description("Mark a subscription charge paid manually")
  .argument("<charge-id>", "Subscription charge ID")
  .action(async (chargeId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/subscription-charges", chargeId, "mark-paid"),
    );
    output.success(data);
  });

subscriptionChargesCommand
  .command("revert-payment")
  .description("Revert a paid subscription charge")
  .argument("<charge-id>", "Subscription charge ID")
  .action(async (chargeId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/subscription-charges", chargeId, "revert-payment"),
    );
    output.success(data);
  });
