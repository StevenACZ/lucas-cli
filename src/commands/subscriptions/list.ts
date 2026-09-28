import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { CliError } from "../../lib/errors.js";
import { parseLimit, parseOffset } from "../../lib/paging.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { enrichSubscriptionsWithCharges } from "../../lib/subscription-enrichment.js";
import {
  extractItems,
  type Subscription,
  type SubscriptionCharge,
} from "../../lib/types.js";
import { stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

const DEFAULT_LIMIT = 100;

interface SubscriptionListOptions {
  limit?: string;
  offset?: string;
  frequency?: string;
  type?: string;
  groupId?: string;
  includeInactive?: boolean;
}

export function getSubscriptionItems(response: unknown): Subscription[] | null {
  return extractItems<Subscription>(response);
}

export function buildSubscriptionListPayload(
  response: unknown,
  charges: SubscriptionCharge[],
): { data: Row[]; meta: Row } | null {
  const subscriptions = getSubscriptionItems(response);
  if (!subscriptions) return null;
  const data = stripHeavy(
    enrichSubscriptionsWithCharges(subscriptions, charges) as unknown as Row[],
  );
  const wrapper = Array.isArray(response) ? {} : (response as Row);
  return {
    data,
    meta: {
      count: data.length,
      ...(wrapper.pagination as Row | undefined),
      ...(wrapper.summary !== undefined && { summary: wrapper.summary }),
    },
  };
}

export function buildSubscriptionListParams(
  opts: SubscriptionListOptions,
): Record<string, string> | undefined {
  return compactParams({
    limit: String(parseLimit(opts.limit, DEFAULT_LIMIT)),
    offset: String(parseOffset(opts.offset)),
    frequency: opts.frequency,
    type: opts.type,
    groupId: opts.groupId,
    includeInactive: opts.includeInactive ? "true" : undefined,
  });
}

export const listSubscriptionsCommand = new Command("list")
  .description("List subscriptions with derived billing context for AI agents")
  .option("--limit <n>", `Items per page, 1..100 (default ${DEFAULT_LIMIT})`)
  .option("--offset <n>", "Items to skip")
  .option(
    "--frequency <frequency>",
    "MONTHLY, YEARLY or ALL",
    choice(["MONTHLY", "YEARLY", "ALL"]),
  )
  .option(
    "--type <type>",
    "SUBSCRIPTION, SERVICE or ALL",
    choice(["SUBSCRIPTION", "SERVICE", "ALL"]),
  )
  .option("--group-id <id>", "Filter by subscription group id")
  .option("--include-inactive", "Also list paused (inactive) subscriptions")
  .addHelpText(
    "after",
    `
Output: data is an array; meta has count, limit, offset, hasMore, total and
the backend summary (active subscriptions only).

Notes:
  - Billing context (computedStatus, latest charge fields) is derived from
    GET /api/subscription-charges, which returns at most the 100 newest
    charges; very old charge history is not considered.
  - computedStatus reflects the oldest unpaid charge, so an overdue charge is
    still reported when a newer charge is already paid. It is UNKNOWN when the
    subscription has no charge history at all.
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
    const payload = buildSubscriptionListPayload(
      subscriptionsResponse,
      charges,
    );
    if (!payload) {
      throw new CliError({
        code: "UNEXPECTED_RESPONSE",
        message: "Unexpected subscriptions response",
        status: 502,
      });
    }
    output.success(payload.data, payload.meta);
  });
