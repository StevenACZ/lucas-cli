import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { parseDateOption } from "../../lib/dates.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const balanceHistoryCommand = new Command("balance-history")
  .description("Daily balance history for an account")
  .argument("<account>", "Account name or id")
  .option(
    "--range <range>",
    "7d, 14d, month or year (default: month to date)",
    choice(["7d", "14d", "month", "year"]),
  )
  .option(
    "--anchor-date <date>",
    "Local day pivot: today, yesterday or YYYY-MM-DD",
  )
  .action(
    async (ref: string, opts: { range?: string; anchorDate?: string }) => {
      const id = String(await resolveAccountId(ref));
      const data = await apiRequest(
        "GET",
        resourcePath("/api/accounts", id, "balance-history"),
        undefined,
        compactParams({
          range: opts.range,
          anchorDate: parseDateOption(opts.anchorDate, "--anchor-date"),
        }),
      );
      output.success(stripHeavy(data));
    },
  );
