import { Command, InvalidArgumentError, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { invalidValue } from "../../lib/errors.js";
import { parseAmount, parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveAccount, resolveCategory } from "../../lib/resolve.js";
import {
  accountRef,
  categoryView,
  stripHeavy,
  transactionView,
} from "../../lib/views.js";

type Row = Record<string, unknown>;

export function parseMovementType(value: string): string {
  const type = value.trim().toUpperCase();
  if (type !== "INCOME" && type !== "EXPENSE") {
    throw new InvalidArgumentError("Use INCOME or EXPENSE.");
  }
  return type;
}

interface CreateOptions {
  account?: string;
  accountId?: string;
  amount: string;
  type: string;
  description: string;
  category?: string;
  categoryId?: string;
  date?: string;
  notes?: string;
  cashbackAmount?: string;
  dryRun?: boolean;
  full?: boolean;
}

export const createTransactionCommand = new Command("create")
  .description("Create an income or expense on one account")
  .option("--account <name|id>", "Account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .requiredOption("--amount <amount>", "Positive amount, up to 2 decimals")
  .requiredOption("--type <type>", "INCOME or EXPENSE", parseMovementType)
  .requiredOption("--description <text>", "What the movement is")
  .option("--category <name|id>", "Category name, slug or id")
  .addOption(new Option("--category-id <id>").hideHelp())
  .option(
    "--date <date>",
    "today, yesterday, YYYY-MM-DD (12:00 local) or YYYY-MM-DDTHH:mm; default now",
  )
  .option("--notes <text>", "Free-form notes")
  .option(
    "--cashback-amount <amount>",
    "Explicit cashback earned (credit card with cashback)",
  )
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .option("--full", "Print the raw backend objects")
  .addHelpText(
    "after",
    `
Examples:
  lucas transactions create --account "ITK Soles" --type EXPENSE --amount 42.90 \\
    --description "iCloud" --category Subscriptions --date today
  lucas transactions create --account "iO Soles" --type EXPENSE --amount 120 \\
    --description "Supermercado" --dry-run
`,
  )
  .action(async (opts: CreateOptions) => {
    const accountRefInput = opts.account ?? opts.accountId;
    if (!accountRefInput) {
      throw invalidValue("--account is required (name or id)");
    }
    const amount = parseAmount(opts.amount, "--amount");
    const date = parseDateOption(opts.date);
    const account = await resolveAccount(accountRefInput);
    const categoryInput = opts.category ?? opts.categoryId;
    const category = categoryInput
      ? await resolveCategory(categoryInput, opts.type)
      : undefined;

    const body: Row = {
      accountId: account.id,
      amount,
      type: opts.type,
      description: opts.description,
      ...(category && { categoryId: category.id }),
      ...(date && { date }),
      ...(opts.notes !== undefined && { notes: opts.notes }),
      ...(opts.cashbackAmount !== undefined && {
        cashbackAmount: parseFiniteNumber(
          opts.cashbackAmount,
          "--cashback-amount",
        ),
      }),
    };

    if (opts.dryRun) {
      output.success({
        dryRun: true,
        request: { method: "POST", path: "/api/transactions", body },
        account: accountRef(account),
        category: category ? categoryView(category) : null,
      });
      return;
    }

    const created = await apiRequest<Row>("POST", "/api/transactions", body);
    const [accountAfter] = await accountsAfterWrite([String(account.id)]);
    output.success({
      transaction: opts.full ? stripHeavy(created) : transactionView(created),
      account: accountAfter,
    });
  });
