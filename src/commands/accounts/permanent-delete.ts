import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { CliError, requireYes } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { loadAccounts, normalizeName } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { extractItems } from "../../lib/types.js";
import { accountRef, accountView, stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

async function findExactAccount(ref: string): Promise<Row> {
  const archived =
    extractItems<Row>(
      await apiRequest<unknown>("GET", "/api/accounts/archived"),
      ["accounts", "items"],
    ) ?? [];
  const rows = [...(await loadAccounts()), ...archived];
  const byId = rows.find((row) => row.id === ref.trim());
  if (byId) return byId;

  const wanted = normalizeName(ref);
  const matches = rows.filter((row) =>
    [
      normalizeName(row.name),
      normalizeName(`${row.bank} ${row.name}`),
    ].includes(wanted),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new CliError({
      code: "AMBIGUOUS",
      message: `"${ref}" matches ${matches.length} accounts`,
      hint: "Use the id",
      details: { candidates: matches.map(accountView) },
    });
  }
  throw new CliError({
    code: "NOT_FOUND",
    message: `No account is named exactly "${ref}"`,
    hint: "Run: lucas accounts list --include-archived",
    details: { available: rows.map((row) => row.name) },
  });
}

export const permanentDeleteAccountCommand = new Command("permanent-delete")
  .description(
    "Delete an active or archived account and all its movements (permanent)",
  )
  .argument("<account>", "Exact account name or id")
  .option("--yes", "Confirm the permanent deletion")
  .action(async (ref: string, opts: { yes?: boolean }) => {
    requireYes(opts.yes, "Permanently deleting an account");
    const account = await findExactAccount(ref);
    await apiRequest(
      "DELETE",
      resourcePath("/api/accounts", String(account.id), "permanent"),
    );
    output.success({ deleted: accountRef(account) });
  });

export const emptyArchiveCommand = new Command("empty-archive")
  .description(
    "Delete every archived account and all their movements (permanent)",
  )
  .option("--yes", "Confirm the permanent deletion")
  .action(async (opts: { yes?: boolean }) => {
    requireYes(opts.yes, "Emptying the account archive");
    const data = await apiRequest("DELETE", "/api/accounts/archived");
    output.success(stripHeavy(data));
  });
