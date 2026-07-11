import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { enrichSubscriptionsWithCharges } from "../../lib/subscription-enrichment.js";
import {
  extractItems,
  type Subscription,
  type SubscriptionCharge,
} from "../../lib/types.js";

interface SubscriptionListOptions {
  limit?: string;
  offset?: string;
  frequency?: string;
  type?: string;
  groupId?: string;
}

export function getSubscriptionItems(response: unknown): Subscription[] | null {
  return extractItems<Subscription>(response);
}

export function buildSubscriptionListParams(
  opts: SubscriptionListOptions,
): Record<string, string> | undefined {
  return compactParams({
    limit: opts.limit,
    offset: opts.offset,
    frequency: opts.frequency,
    type: opts.type,
    groupId: opts.groupId,
  });
}

export const listSubscriptionsCommand = new Command("list")
  .description("List subscriptions with derived billing context for AI agents")
  .option("--limit <n>", "Items per page (1..100)")
  .option("--offset <n>", "Pagination offset")
  .option("--frequency <frequency>", "Filter by frequency (MONTHLY|YEARLY|ALL)")
  .option("--type <type>", "Filter by type (SUBSCRIPTION|SERVICE|ALL)")
  .option("--group-id <id>", "Filter by subscription group ID")
  .addHelpText(
    "after",
    `
Notes:
  - Billing context (computedStatus, latest charge fields) is derived from
    GET /api/subscription-charges, which returns at most the 100 newest
    charges; very old charge history is not considered.
`,
  )
  .action(async (opts: SubscriptionListOptions) => {
    const [subscriptionsResponse, charges] = await Promise.all([
      apiRequest<unknown>(
        "GET",
        "/api/subscriptions",
        undefined,
        buildSubscriptionListParams(opts),
      ),
      apiRequest<SubscriptionCharge[]>("GET", "/api/subscription-charges"),
    ]);
    const subscriptions = getSubscriptionItems(subscriptionsResponse);
    if (!subscriptions) {
      return output.error("Unexpected subscriptions response", 502, {
        code: "UNEXPECTED_RESPONSE",
      });
    }
    output.success(enrichSubscriptionsWithCharges(subscriptions, charges));
  });
