import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const createSubscriptionCommand = new Command("create")
  .description("Create a new subscription")
  .requiredOption("--name <name>", "Subscription name")
  .requiredOption("--amount <amount>", "Subscription amount")
  .requiredOption("--frequency <freq>", "Frequency (MONTHLY|YEARLY)")
  .requiredOption("--billing-day <day>", "Billing day of the month")
  .option("--account-id <id>", "Account ID")
  .option("--currency <code>", "Currency code")
  .option("--billing-month <month>", "Billing month (for YEARLY)")
  .option("--icon <icon>", "Icon")
  .option("--color <color>", "Color")
  .option("--category-id <id>", "Category ID")
  .option("--type <type>", "Type")
  .option("--auto-record", "Enable auto-record")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .option("--description <desc>", "Description")
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "frequency", body: "frequency" },
      { opt: "billingDay", body: "billingDay", type: "number" },
      { opt: "accountId", body: "accountId" },
      { opt: "currency", body: "currency" },
      { opt: "billingMonth", body: "billingMonth", type: "number" },
      { opt: "icon", body: "icon" },
      { opt: "color", body: "color" },
      { opt: "categoryId", body: "categoryId" },
      { opt: "type", body: "type" },
      { opt: "autoRecord", body: "autoRecord", type: "boolean" },
      { opt: "startDate", body: "startDate" },
      { opt: "description", body: "description" },
    ]);
    const data = await apiRequest("POST", "/api/subscriptions", body);
    output.success(data);
  });
