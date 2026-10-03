import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { stripHeavy } from "../../lib/views.js";

export const settingsCommand = new Command("settings").description(
  "Manage user settings",
);

settingsCommand
  .command("get")
  .description("Get current user settings")
  .action(async () => {
    const data = await apiRequest("GET", "/api/settings");
    output.success(stripHeavy(data));
  });

settingsCommand
  .command("update")
  .description("Update user settings")
  .option("--exchange-rate <rate>", "Manual exchange rate (positive number)")
  .option("--auto-exchange", "Use the automatic exchange rate")
  .option("--no-auto-exchange", "Use the manual exchange rate")
  .option("--show-excluded-accounts", "Show excluded accounts")
  .option("--no-show-excluded-accounts", "Hide excluded accounts")
  .option(
    "--theme <theme>",
    "dark, light or system",
    choice(["dark", "light", "system"]),
  )
  .option("--primary-timezone <tz>", "IANA timezone, e.g. America/Lima")
  .option("--language <language>", "es or en", choice(["es", "en"]))
  .option("--ai-enabled", "Enable AI features")
  .option("--no-ai-enabled", "Disable AI features")
  .option("--ai-smart-features-enabled", "Enable AI smart features")
  .option("--no-ai-smart-features-enabled", "Disable AI smart features")
  .option(
    "--ai-custom-context <text>",
    'Custom context for the AI (max 2000 chars; "" clears it)',
  )
  .option("--subscription-reminders-enabled", "Enable subscription reminders")
  .option(
    "--no-subscription-reminders-enabled",
    "Disable subscription reminders",
  )
  .option(
    "--subscription-reminder-advance-days <days>",
    "Reminder advance days",
  )
  .option(
    "--subscription-reminder-time-minutes <minutes>",
    "Reminder time as local minutes since midnight",
  )
  .option(
    "--subscription-pending-advance-days <days>",
    "Pending charge visibility advance days",
  )
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "exchangeRate", body: "exchangeRate", type: "number" },
      { opt: "autoExchange", body: "autoExchange", type: "boolean" },
      {
        opt: "showExcludedAccounts",
        body: "showExcludedAccounts",
        type: "boolean",
      },
      { opt: "theme", body: "theme" },
      { opt: "primaryTimezone", body: "primaryTimezone" },
      { opt: "language", body: "language" },
      { opt: "aiEnabled", body: "aiEnabled", type: "boolean" },
      {
        opt: "aiSmartFeaturesEnabled",
        body: "aiSmartFeaturesEnabled",
        type: "boolean",
      },
      { opt: "aiCustomContext", body: "aiCustomContext" },
      {
        opt: "subscriptionRemindersEnabled",
        body: "subscriptionRemindersEnabled",
        type: "boolean",
      },
      {
        opt: "subscriptionReminderAdvanceDays",
        body: "subscriptionReminderAdvanceDays",
        type: "number",
      },
      {
        opt: "subscriptionReminderTimeMinutes",
        body: "subscriptionReminderTimeMinutes",
        type: "number",
      },
      {
        opt: "subscriptionPendingAdvanceDays",
        body: "subscriptionPendingAdvanceDays",
        type: "number",
      },
    ]);
    if (Object.keys(body).length === 0) {
      throw invalidValue("Nothing to update: pass at least one option");
    }
    const data = await apiRequest("PUT", "/api/settings", body);
    output.success(stripHeavy(data));
  });
