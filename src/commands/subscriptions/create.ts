import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { resolveAccountId, resolveCategoryId } from "../../lib/resolve.js";
import { stripHeavy } from "../../lib/views.js";

export const createSubscriptionCommand = new Command("create")
  .description("Create a new subscription")
  .requiredOption("--name <name>", "Subscription name")
  .requiredOption("--amount <amount>", "Subscription amount")
  .requiredOption(
    "--frequency <freq>",
    "MONTHLY or YEARLY",
    choice(["MONTHLY", "YEARLY"]),
  )
  .requiredOption("--billing-day <day>", "Due day of the month, 1..31")
  .option(
    "--payment-start-day <day>",
    "Day the payment window opens (1..31; omit to allow paying only on the due day)",
  )
  .option("--account <name|id>", "Paying account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--currency <code>", "ISO currency code, e.g. PEN or USD")
  .option("--billing-month <month>", "Billing month 1..12 (YEARLY only)")
  .option("--icon <icon>", "Icon")
  .option("--color <color>", "Color")
  .option("--category <name|id>", "Expense category name, slug or id")
  .addOption(new Option("--category-id <id>").hideHelp())
  .option("--group-id <id>", "Subscription group ID")
  .option(
    "--type <type>",
    "SUBSCRIPTION or SERVICE",
    choice(["SUBSCRIPTION", "SERVICE"]),
  )
  .option("--auto-record", "Enable auto-record")
  .option("--start-date <date>", "First billing day (YYYY-MM-DD)")
  .option("--description <desc>", "Description")
  .option(
    "--reminder-mode <mode>",
    "DEFAULT, CUSTOM or DISABLED",
    choice(["DEFAULT", "CUSTOM", "DISABLED"]),
  )
  .option(
    "--reminder-advance-days <days>",
    "Days before the due day to remind (integer)",
  )
  .option(
    "--reminder-time-minutes <minutes>",
    "Reminder time as local minutes since midnight",
  )
  .addHelpText(
    "after",
    `
Examples:
  lucas subscriptions create --name Netflix --amount 44.90 --frequency MONTHLY \\
    --billing-day 15 --account "Visa Signature" --category Subscriptions
`,
  )
  .action(async (opts) => {
    opts.accountId = await resolveAccountId(opts.account ?? opts.accountId);
    opts.categoryId = await resolveCategoryId(
      opts.category ?? opts.categoryId,
      "EXPENSE",
    );
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "frequency", body: "frequency" },
      { opt: "billingDay", body: "billingDay", type: "number" },
      { opt: "paymentStartDay", body: "paymentStartDay", type: "number" },
      { opt: "accountId", body: "accountId" },
      { opt: "currency", body: "currency" },
      { opt: "billingMonth", body: "billingMonth", type: "number" },
      { opt: "icon", body: "icon" },
      { opt: "color", body: "color" },
      { opt: "categoryId", body: "categoryId" },
      { opt: "groupId", body: "groupId" },
      { opt: "type", body: "type" },
      { opt: "autoRecord", body: "autoRecord", type: "boolean" },
      { opt: "startDate", body: "startDate" },
      { opt: "description", body: "description" },
      { opt: "reminderMode", body: "reminderMode" },
      {
        opt: "reminderAdvanceDays",
        body: "reminderAdvanceDays",
        type: "number",
      },
      {
        opt: "reminderTimeMinutes",
        body: "reminderTimeMinutes",
        type: "number",
      },
    ]);
    const data = await apiRequest("POST", "/api/subscriptions", body);
    output.success(stripHeavy(data));
  });
