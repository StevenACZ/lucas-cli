import { Command } from "commander";
import { apiRequest, apiRequestOrThrow } from "../lib/api-client.js";
import { localDateString } from "../lib/dates.js";
import { output } from "../lib/output.js";
import { extractItems, type AccountsSummary } from "../lib/types.js";
import { accountView } from "../lib/views.js";

type Row = Record<string, unknown>;

async function pendingChargesCount(): Promise<number | null> {
  try {
    const response = await apiRequestOrThrow<Row>(
      "GET",
      "/api/subscription-charges/pending",
      undefined,
      { limit: "1" },
    );
    const summary = response.summary as Row | undefined;
    const pagination = response.pagination as Row | undefined;
    const total = summary?.total ?? pagination?.total;
    return typeof total === "number" ? total : null;
  } catch {
    return null;
  }
}

export const overviewCommand = new Command("overview")
  .description(
    "Everything an agent needs first: accounts, totals, this month's flows and pending charges",
  )
  .addHelpText(
    "after",
    `
Output: {accounts, totals: {balancesByCurrency, debtByCurrency},
month: {year, month, income, expense, net, flowsByCurrency}, pendingCharges}.
The month is the current one in LUCAS_TZ or this machine's timezone.
`,
  )
  .action(async () => {
    const [year, month] = localDateString().split("-").map(Number);
    const [summary, stats, pendingCharges] = await Promise.all([
      apiRequest<AccountsSummary>("GET", "/api/accounts"),
      apiRequest<Row>("GET", "/api/stats/summary", undefined, {
        year: String(year),
        month: String(month),
      }),
      pendingChargesCount(),
    ]);
    const accounts = extractItems<Row>(summary, ["accounts", "items"]) ?? [];
    output.success({
      accounts: accounts.map(accountView),
      totals: {
        balancesByCurrency: summary.balancesByCurrency ?? {},
        debtByCurrency: summary.debtByCurrency ?? {},
      },
      month: {
        year,
        month,
        income: stats.monthlyIncome ?? 0,
        expense: stats.monthlyExpense ?? 0,
        net: stats.monthlyNet ?? 0,
        flowsByCurrency: stats.flowsByCurrency ?? {},
      },
      pendingCharges,
    });
  });
