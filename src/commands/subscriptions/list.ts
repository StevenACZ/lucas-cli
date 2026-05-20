import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import {
  enrichSubscriptionsWithCharges,
  type SubscriptionChargeLike,
  type SubscriptionLike,
} from "../../lib/subscription-enrichment.js";

interface SubscriptionPageResponse {
  items?: unknown;
}

interface SubscriptionListOptions {
  limit?: string;
  offset?: string;
  frequency?: string;
  type?: string;
  groupId?: string;
}

export function getSubscriptionItems(
  response: SubscriptionLike[] | SubscriptionPageResponse,
): SubscriptionLike[] | null {
  if (Array.isArray(response)) return response;

  if (
    response &&
    typeof response === "object" &&
    Array.isArray(response.items)
  ) {
    return response.items as SubscriptionLike[];
  }

  return null;
}

export function buildSubscriptionListParams(
  opts: SubscriptionListOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  if (opts.frequency) params.frequency = opts.frequency;
  if (opts.type) params.type = opts.type;
  if (opts.groupId) params.groupId = opts.groupId;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const listSubscriptionsCommand = new Command("list")
  .description("List subscriptions with derived billing context for AI agents")
  .option("--limit <n>", "Items per page (1..100)")
  .option("--offset <n>", "Pagination offset")
  .option("--frequency <frequency>", "Filter by frequency (MONTHLY|YEARLY|ALL)")
  .option("--type <type>", "Filter by type (SUBSCRIPTION|SERVICE|ALL)")
  .option("--group-id <id>", "Filter by subscription group ID")
  .action(async (opts: SubscriptionListOptions) => {
    const [subscriptionsResponse, charges] = await Promise.all([
      apiRequest<SubscriptionLike[] | SubscriptionPageResponse>(
        "GET",
        "/api/subscriptions",
        undefined,
        buildSubscriptionListParams(opts),
      ),
      apiRequest<SubscriptionChargeLike[]>("GET", "/api/subscription-charges"),
    ]);
    const subscriptions = getSubscriptionItems(subscriptionsResponse);
    if (!subscriptions) {
      return output.error("Unexpected subscriptions response", 502, {
        code: "UNEXPECTED_RESPONSE",
      });
    }
    output.success(enrichSubscriptionsWithCharges(subscriptions, charges));
  });
