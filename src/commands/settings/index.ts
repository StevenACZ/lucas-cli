import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { output } from "../../lib/output.js";

export const settingsCommand = new Command("settings").description(
  "Manage user settings",
);

settingsCommand
  .command("get")
  .description("Get current user settings")
  .action(async () => {
    const data = await apiRequest("GET", "/api/settings");
    output.success(data);
  });

settingsCommand
  .command("update")
  .description("Update user settings")
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
    const data = await apiRequest("PUT", "/api/settings", body);
    output.success(data);
  });
