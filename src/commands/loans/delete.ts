import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { requireYes } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { resolveLoanId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const deleteLoanCommand = new Command("delete")
  .description("Delete a loan and its payment history (permanent)")
  .argument("<loan>", "Exact loan name or id")
  .option("--yes", "Confirm the permanent deletion")
  .action(async (ref: string, opts: { yes?: boolean }) => {
    requireYes(opts.yes, "Deleting a loan");
    const id = await resolveLoanId(ref, { exact: true });
    const data = await apiRequest("DELETE", resourcePath("/api/loans", id));
    output.success(stripHeavy(data));
  });
