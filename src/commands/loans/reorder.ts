import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { loadLoans, resolveLoanId } from "../../lib/resolve.js";
import { extractItems } from "../../lib/types.js";
import { stripHeavy } from "../../lib/views.js";

export const reorderLoansCommand = new Command("reorder")
  .description("Set the display order of loans, first to last")
  .argument("<loan...>", "Loan names or ids in the wanted order")
  .addHelpText(
    "after",
    `
Listed loans go first, in the order given. Loans left out follow them in the
order they already had. Primary loans always list before the others.

Examples:
  lucas loans reorder "Car loan" "Laptop"
`,
  )
  .action(runReorderLoans);

export async function runReorderLoans(refs: string[]): Promise<void> {
  const listed: string[] = [];
  for (const ref of refs) listed.push(await resolveLoanId(ref));
  if (new Set(listed).size !== listed.length) {
    throw invalidValue("Each loan can be listed only once", { value: refs });
  }
  const rest = (await loadLoans())
    .map((loan) => String(loan.id))
    .filter((id) => !listed.includes(id));
  const ids = [...listed, ...rest];
  const rows = stripHeavy(
    extractItems<Record<string, unknown>>(
      await apiRequest("POST", "/api/loans/reorder", { ids }),
      ["items", "loans"],
    ) ?? [],
  );
  output.success(rows, { count: rows.length });
}
