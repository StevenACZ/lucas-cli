import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { parseAmount, parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveCategoryId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy, transactionView } from "../../lib/views.js";
import { parseMovementType } from "./create.js";

type Row = Record<string, unknown>;

interface UpdateOptions {
  description?: string;
  amount?: string;
  type?: string;
  date?: string;
  category?: string;
  categoryId?: string;
  clearCategory?: boolean;
  clearCategoryId?: boolean;
  notes?: string;
  clearNotes?: boolean;
  cashbackAmount?: string;
  full?: boolean;
}

export async function buildTransactionUpdateBody(
  opts: UpdateOptions,
): Promise<Row> {
  const categoryRef = opts.category ?? opts.categoryId;
  const clearCategory = opts.clearCategory || opts.clearCategoryId;
  const date = parseDateOption(opts.date);
  return {
    ...(opts.description !== undefined && { description: opts.description }),
    ...(opts.amount !== undefined && {
      amount: parseAmount(opts.amount, "--amount"),
    }),
    ...(opts.type !== undefined && { type: opts.type }),
    ...(date && { date }),
    ...(clearCategory
      ? { categoryId: null }
      : categoryRef !== undefined && {
          categoryId: await resolveCategoryId(categoryRef, opts.type),
        }),
    ...(opts.clearNotes
      ? { notes: null }
      : opts.notes !== undefined && { notes: opts.notes }),
    ...(opts.cashbackAmount !== undefined && {
      cashbackAmount: parseFiniteNumber(
        opts.cashbackAmount,
        "--cashback-amount",
      ),
    }),
  };
}

export const updateTransactionCommand = new Command("update")
  .description("Update an income or expense")
  .argument("<id>", "Transaction id")
  .option("--description <text>", "What the movement is")
  .option("--amount <amount>", "Positive amount, up to 2 decimals")
  .option("--type <type>", "INCOME or EXPENSE", parseMovementType)
  .option(
    "--date <date>",
    "today, yesterday, YYYY-MM-DD (12:00 local) or YYYY-MM-DDTHH:mm",
  )
  .option("--category <name|id>", "Category name, slug or id")
  .addOption(new Option("--category-id <id>").hideHelp())
  .option("--clear-category", "Remove the category")
  .addOption(new Option("--clear-category-id").hideHelp())
  .option("--notes <text>", "Free-form notes")
  .option("--clear-notes", "Remove the notes")
  .option(
    "--cashback-amount <amount>",
    "Explicit cashback earned (CREDIT expenses with cashback enabled)",
  )
  .option("--full", "Print the raw backend object")
  .addHelpText(
    "after",
    `
Examples:
  lucas transactions update tx_1 --category Groceries --date yesterday
  lucas transactions update tx_1 --amount 18.90 --notes "Split with Ana"
`,
  )
  .action(async (id: string, opts: UpdateOptions) => {
    const body = await buildTransactionUpdateBody(opts);
    const updated = await apiRequest<Row>(
      "PUT",
      resourcePath("/api/transactions", id),
      body,
    );
    const [account] = await accountsAfterWrite([
      updated.accountId as string | undefined,
    ]);
    output.success({
      transaction: opts.full ? stripHeavy(updated) : transactionView(updated),
      account,
    });
  });
