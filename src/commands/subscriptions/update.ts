import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const updateSubscriptionCommand = new Command("update")
  .description("Update a subscription")
  .argument("<id>", "Subscription ID")
  .option("--name <name>", "Subscription name")
  .option("--amount <amount>", "Amount")
  .option("--frequency <freq>", "Frequency (MONTHLY|YEARLY|WEEKLY)")
  .option("--next-billing-date <date>", "Next billing date")
  .option("--description <desc>", "Description")
  .action(async (id: string, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.amount) body.amount = Number(opts.amount);
    if (opts.frequency) body.frequency = opts.frequency;
    if (opts.nextBillingDate) body.nextBillingDate = opts.nextBillingDate;
    if (opts.description) body.description = opts.description;

    const data = await apiRequest("PUT", `/api/subscriptions/${id}`, body);
    output.success(data);
  });
