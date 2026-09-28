import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { stripHeavy } from "../../lib/views.js";

interface SubscriptionCalendarOptions {
  month?: string;
  type?: string;
  frequency?: string;
  groupId?: string;
}

export function buildSubscriptionCalendarParams(
  opts: SubscriptionCalendarOptions,
): Record<string, string> | undefined {
  return compactParams({
    month: opts.month,
    type: opts.type,
    frequency: opts.frequency,
    groupId: opts.groupId,
  });
}

export const subscriptionCalendarCommand = new Command("calendar")
  .description("Show the monthly subscription calendar")
  .option("--month <yyyy-mm>", "Calendar month (YYYY-MM)")
  .option(
    "--type <type>",
    "SUBSCRIPTION, SERVICE or ALL",
    choice(["SUBSCRIPTION", "SERVICE", "ALL"]),
  )
  .option(
    "--frequency <frequency>",
    "MONTHLY, YEARLY or ALL",
    choice(["MONTHLY", "YEARLY", "ALL"]),
  )
  .option("--group-id <id>", "Filter by subscription group ID")
  .action(async (opts: SubscriptionCalendarOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/subscriptions/calendar",
      undefined,
      buildSubscriptionCalendarParams(opts),
    );
    output.success(stripHeavy(data));
  });
