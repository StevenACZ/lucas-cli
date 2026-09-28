import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { resolveAccountId, resolveCategoryId } from "../../lib/resolve.js";
import { stripHeavy } from "../../lib/views.js";
import { resourcePath } from "../../lib/resource-path.js";

export const updateSubscriptionCommand = new Command("update")
  .description("Update a subscription")
  .argument("<id>", "Subscription ID")
  .option("--name <name>", "Subscription name")
  .option("--amount <amount>", "Amount")
  .option(
    "--frequency <freq>",
    "MONTHLY or YEARLY",
    choice(["MONTHLY", "YEARLY"]),
  )
  .option("--description <desc>", "Description")
  .option("--clear-description", "Clear description")
  .option("--currency <code>", "ISO currency code, e.g. PEN or USD")
  .option("--account <name|id>", "Paying account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--clear-account", "Unlink the paying account")
  .addOption(new Option("--clear-account-id").hideHelp())
  .option("--billing-day <day>", "Due day of the month, 1..31")
  .option("--payment-start-day <day>", "Day the payment window opens (1..31)")
  .option(
    "--clear-payment-start-day",
    "Clear payment window (payable only on the due day)",
  )
  .option("--billing-month <month>", "Billing month 1..12 (YEARLY only)")
  .option("--icon <icon>", "Icon")
  .option("--clear-icon", "Clear icon")
  .option("--color <color>", "Color")
  .option("--clear-color", "Clear color")
  .option("--category <name|id>", "Expense category name, slug or id")
  .addOption(new Option("--category-id <id>").hideHelp())
  .option("--clear-category", "Remove the category")
  .addOption(new Option("--clear-category-id").hideHelp())
  .option("--group-id <id>", "Subscription group ID")
  .option("--clear-group-id", "Clear subscription group")
  .option(
    "--type <type>",
    "SUBSCRIPTION or SERVICE",
    choice(["SUBSCRIPTION", "SERVICE"]),
  )
  .option("--start-date <date>", "First billing day (YYYY-MM-DD)")
  .option("--clear-start-date", "Clear start date")
  .option("--auto-record", "Enable auto-record")
  .option("--no-auto-record", "Disable auto-record")
  .option("--is-active", "Activate subscription")
  .option("--no-is-active", "Deactivate subscription")
  .option(
    "--reminder-mode <mode>",
    "DEFAULT, CUSTOM or DISABLED",
    choice(["DEFAULT", "CUSTOM", "DISABLED"]),
  )
  .option(
    "--reminder-advance-days <days>",
    "Days before the due day to remind (integer)",
  )
  .option("--clear-reminder-advance-days", "Clear custom reminder advance days")
  .option(
    "--reminder-time-minutes <minutes>",
    "Reminder time as local minutes since midnight",
  )
  .option("--clear-reminder-time-minutes", "Clear custom reminder time")
  .addHelpText(
    "after",
    "\nExample:\n  lucas subscriptions update <id> --billing-day 30\n",
  )
  .action(async (id: string, opts) => {
    opts.clearAccount ||= opts.clearAccountId;
    opts.clearCategory ||= opts.clearCategoryId;
    opts.accountId = await resolveAccountId(opts.account ?? opts.accountId);
    opts.categoryId = await resolveCategoryId(
      opts.category ?? opts.categoryId,
      "EXPENSE",
    );
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
      { opt: "accountId", body: "accountId", clearOpt: "clearAccount" },
      { opt: "billingDay", body: "billingDay", type: "number" },
      {
        opt: "paymentStartDay",
        body: "paymentStartDay",
        type: "number",
        clearOpt: "clearPaymentStartDay",
      },
      { opt: "billingMonth", body: "billingMonth", type: "number" },
      { opt: "icon", body: "icon", clearOpt: "clearIcon" },
      { opt: "color", body: "color", clearOpt: "clearColor" },
      { opt: "categoryId", body: "categoryId", clearOpt: "clearCategory" },
      { opt: "groupId", body: "groupId", clearOpt: "clearGroupId" },
      { opt: "type", body: "type" },
      { opt: "startDate", body: "startDate", clearOpt: "clearStartDate" },
      { opt: "autoRecord", body: "autoRecord", type: "boolean" },
      { opt: "isActive", body: "isActive", type: "boolean" },
      { opt: "reminderMode", body: "reminderMode" },
      {
        opt: "reminderAdvanceDays",
        body: "reminderAdvanceDays",
        type: "number",
        clearOpt: "clearReminderAdvanceDays",
      },
      {
        opt: "reminderTimeMinutes",
        body: "reminderTimeMinutes",
        type: "number",
        clearOpt: "clearReminderTimeMinutes",
      },
    ]);
    const data = await apiRequest(
      "PUT",
      resourcePath("/api/subscriptions", id),
      body,
    );
    output.success(stripHeavy(data));
  });
