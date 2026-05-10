import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface ParseExpensesOptions {
  date?: string;
  accountId?: string;
}

export async function runParseExpenses(
  text: string,
  opts: ParseExpensesOptions,
) {
  const body: Record<string, unknown> = { text };
  if (opts.date) body.date = opts.date;
  if (opts.accountId) body.accountId = opts.accountId;

  const data = await apiRequest("POST", "/api/ai/parse-expenses", body);
  output.success(data);
}

export const parseExpensesCommand = new Command("parse-expenses")
  .description("Parse text into expense transactions")
  .argument("<text...>", "Expense text to parse")
  .option("--date <date>", "Context date (YYYY-MM-DD)")
  .option("--account-id <id>", "Account ID for duplicate detection")
  .action(async (textParts: string[], opts: ParseExpensesOptions) => {
    const text = textParts.join(" ").trim();
    if (!text) {
      output.error("Text is required");
    }

    await runParseExpenses(text, opts);
  });
