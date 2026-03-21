import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const createSubscriptionCommand = new Command("create")
  .description("Create a new subscription")
  .requiredOption("--name <name>", "Subscription name")
  .requiredOption("--amount <amount>", "Subscription amount")
  .requiredOption("--account-id <id>", "Account ID")
  .requiredOption("--frequency <freq>", "Frequency (MONTHLY|YEARLY|WEEKLY)")
  .option("--next-billing-date <date>", "Next billing date")
  .option("--description <desc>", "Description")
  .action(async (opts) => {
    const body: Record<string, unknown> = {
      name: opts.name,
      amount: Number(opts.amount),
      accountId: opts.accountId,
      frequency: opts.frequency,
    };
    if (opts.nextBillingDate) body.nextBillingDate = opts.nextBillingDate;
    if (opts.description) body.description = opts.description;

    const data = await apiRequest("POST", "/api/subscriptions", body);
    output.success(data);
  });
