import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateSubscriptionCommand = new Command("update")
  .description("Update a subscription")
  .argument("<id>", "Subscription ID")
  .option("--name <name>", "Subscription name")
  .option("--amount <amount>", "Amount")
  .option("--frequency <freq>", "Frequency (MONTHLY|YEARLY)")
  .option("--description <desc>", "Description")
  .option("--currency <code>", "Currency code")
  .option("--account-id <id>", "Account ID")
  .option("--billing-day <day>", "Billing day of the month")
  .option("--billing-month <month>", "Billing month (for YEARLY)")
  .option("--icon <icon>", "Icon")
  .option("--color <color>", "Color")
  .option("--category-id <id>", "Category ID")
  .option("--type <type>", "Type")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .option("--auto-record", "Enable auto-record")
  .option("--no-auto-record", "Disable auto-record")
  .option("--is-active", "Activate subscription")
  .option("--no-is-active", "Deactivate subscription")
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "frequency", body: "frequency" },
      { opt: "description", body: "description" },
      { opt: "currency", body: "currency" },
      { opt: "accountId", body: "accountId" },
      { opt: "billingDay", body: "billingDay", type: "number" },
      { opt: "billingMonth", body: "billingMonth", type: "number" },
      { opt: "icon", body: "icon" },
      { opt: "color", body: "color" },
      { opt: "categoryId", body: "categoryId" },
      { opt: "type", body: "type" },
      { opt: "startDate", body: "startDate" },
      { opt: "autoRecord", body: "autoRecord", type: "boolean" },
      { opt: "isActive", body: "isActive", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", `/api/subscriptions/${id}`, body);
    output.success(data);
  });
