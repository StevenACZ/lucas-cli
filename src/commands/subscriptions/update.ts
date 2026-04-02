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
  .option("--clear-description", "Clear description")
  .option("--currency <code>", "Currency code")
  .option("--account-id <id>", "Account ID")
  .option("--clear-account-id", "Clear account ID")
  .option("--billing-day <day>", "Billing day of the month")
  .option("--billing-month <month>", "Billing month (for YEARLY)")
  .option("--icon <icon>", "Icon")
  .option("--clear-icon", "Clear icon")
  .option("--color <color>", "Color")
  .option("--clear-color", "Clear color")
  .option("--category-id <id>", "Category ID")
  .option("--clear-category-id", "Clear category ID")
  .option("--type <type>", "Type")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .option("--clear-start-date", "Clear start date")
  .option("--auto-record", "Enable auto-record")
  .option("--no-auto-record", "Disable auto-record")
  .option("--is-active", "Activate subscription")
  .option("--no-is-active", "Deactivate subscription")
  .addHelpText(
    "after",
    "\nExample:\n  lucas subscriptions update <id> --billing-day 30\n",
  )
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "frequency", body: "frequency" },
      {
        opt: "description",
        body: "description",
        clearOpt: "clearDescription",
      },
      { opt: "currency", body: "currency" },
      { opt: "accountId", body: "accountId", clearOpt: "clearAccountId" },
      { opt: "billingDay", body: "billingDay", type: "number" },
      { opt: "billingMonth", body: "billingMonth", type: "number" },
      { opt: "icon", body: "icon", clearOpt: "clearIcon" },
      { opt: "color", body: "color", clearOpt: "clearColor" },
      { opt: "categoryId", body: "categoryId", clearOpt: "clearCategoryId" },
      { opt: "type", body: "type" },
      { opt: "startDate", body: "startDate", clearOpt: "clearStartDate" },
      { opt: "autoRecord", body: "autoRecord", type: "boolean" },
      { opt: "isActive", body: "isActive", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", `/api/subscriptions/${id}`, body);
    output.success(data);
  });
