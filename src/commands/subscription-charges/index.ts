import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { extractItems } from "../../lib/types.js";
import { stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

export function chargeRows(response: unknown): Row[] {
  return stripHeavy(extractItems<Row>(response, ["items", "charges"]) ?? []);
}

interface PendingChargesOptions {
  limit?: string;
  offset?: string;
}

export function buildPendingChargesParams(
  opts: PendingChargesOptions,
): Record<string, string> | undefined {
  return compactParams({ limit: opts.limit, offset: opts.offset });
}

export const subscriptionChargesCommand = new Command(
  "subscription-charges",
).description("Manage subscription billing charges");

subscriptionChargesCommand
  .command("list")
  .description(
    "List generated subscription charges, newest due first (max 100)",
  )
  .option("--subscription <id>", "Only charges of this subscription id")
  .option(
    "--status <status>",
    "PENDING, OVERDUE or PAID",
    choice(["PENDING", "OVERDUE", "PAID"]),
  )
  .action(async (opts: { subscription?: string; status?: string }) => {
    const rows = chargeRows(
      await apiRequest(
        "GET",
        "/api/subscription-charges",
        undefined,
        compactParams({
          subscriptionId: opts.subscription,
          status: opts.status,
        }),
      ),
    );
    output.success(rows, { count: rows.length });
  });

subscriptionChargesCommand
  .command("pending")
  .description("List pending and overdue subscription charges")
  .option("--limit <n>", "Items per page, 1..100")
  .option("--offset <n>", "Items to skip")
  .action(async (opts: PendingChargesOptions) => {
    const response = await apiRequest<unknown>(
      "GET",
      "/api/subscription-charges/pending",
      undefined,
      buildPendingChargesParams(opts),
    );
    const rows = chargeRows(response);
    const wrapper = Array.isArray(response) ? {} : (response as Row);
    output.success(rows, {
      count: rows.length,
      ...(wrapper.pagination as Row | undefined),
      ...(wrapper.summary !== undefined && { summary: wrapper.summary }),
    });
  });

subscriptionChargesCommand
  .command("by-account")
  .description("List subscription charges for an account")
  .argument("<account>", "Account name or id")
  .action(async (ref: string) => {
    const accountId = String(await resolveAccountId(ref));
    const rows = chargeRows(
      await apiRequest(
        "GET",
        resourcePath("/api/subscription-charges/by-account", accountId),
      ),
    );
    output.success(rows, { count: rows.length });
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
    output.success(stripHeavy(data));
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
    output.success(stripHeavy(data));
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
    output.success(stripHeavy(data));
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
    output.success(stripHeavy(data));
  });
