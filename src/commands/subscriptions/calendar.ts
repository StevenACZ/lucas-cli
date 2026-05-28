import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface SubscriptionCalendarOptions {
  month?: string;
  type?: string;
  frequency?: string;
  groupId?: string;
}

export function buildSubscriptionCalendarParams(
  opts: SubscriptionCalendarOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.month) params.month = opts.month;
  if (opts.type) params.type = opts.type;
  if (opts.frequency) params.frequency = opts.frequency;
  if (opts.groupId) params.groupId = opts.groupId;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const subscriptionCalendarCommand = new Command("calendar")
  .description("Show the monthly subscription calendar")
  .option("--month <yyyy-mm>", "Calendar month (YYYY-MM)")
  .option("--type <type>", "Filter by type (SUBSCRIPTION|SERVICE|ALL)")
  .option("--frequency <frequency>", "Filter by frequency (MONTHLY|YEARLY|ALL)")
  .option("--group-id <id>", "Filter by subscription group ID")
  .action(async (opts: SubscriptionCalendarOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/subscriptions/calendar",
      undefined,
      buildSubscriptionCalendarParams(opts),
    );
    output.success(data);
  });
