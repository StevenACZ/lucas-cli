import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { readImagePayloads } from "../../lib/ai-contract.js";
import { output } from "../../lib/output.js";

interface ParseExpensesImageOptions {
  date?: string;
  accountId?: string;
}

export async function runParseExpensesImage(
  paths: string[],
  opts: ParseExpensesImageOptions,
) {
  if (paths.length === 0) {
    output.error("At least one image path is required");
  }

  const images = await readImagePayloads(paths).catch((error) => {
    const message =
      error instanceof Error ? error.message : "Invalid image input";
    output.error(message, 400);
  });

  const body: Record<string, unknown> = { images };
  if (opts.date) body.date = opts.date;
  if (opts.accountId) body.accountId = opts.accountId;

  const data = await apiRequest("POST", "/api/ai/parse-expenses-image", body);
  output.success(data);
}

export const parseExpensesImageCommand = new Command("parse-expenses-image")
  .description("Parse up to 10 receipt images into expense transactions")
  .argument("<paths...>", "Image file paths")
  .option("--date <date>", "Context date (YYYY-MM-DD)")
  .option("--account-id <id>", "Account ID for duplicate detection")
  .action(async (paths: string[], opts: ParseExpensesImageOptions) => {
    await runParseExpensesImage(paths, opts);
  });
