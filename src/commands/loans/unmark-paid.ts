import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { CliError } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { resolveLoanId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import type { LoanDetails } from "../../lib/types.js";
import { stripHeavy } from "../../lib/views.js";

export const unmarkPaidLoanCommand = new Command("unmark-paid")
  .description("Reverse a loan payment (default: most recent)")
  .argument("<loan>", "Loan name or id")
  .option("--payment-id <id>", "Specific payment ID to reverse")
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    "\nExamples:\n  lucas loans unmark-paid <loan-id>\n  lucas loans unmark-paid <loan-id> --payment-id <payment-id>\n",
  )
  .action(
    async (ref: string, opts: { paymentId?: string; dryRun?: boolean }) => {
      const id = await resolveLoanId(ref);
      let paymentId = opts.paymentId;

      if (!paymentId) {
        const loan = await apiRequest<LoanDetails>(
          "GET",
          resourcePath("/api/loans", id),
        );
        if (!loan.payments || loan.payments.length === 0) {
          throw new CliError({
            code: "NOT_FOUND",
            message: "No payments found for this loan",
            details: { loanId: id },
          });
        }
        const sorted = [...loan.payments].sort(
          (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
        );
        paymentId = sorted[0].id;
      }

      const path = resourcePath("/api/loans", id, "reverse-payment");
      if (opts.dryRun) {
        output.success({
          dryRun: true,
          request: { method: "POST", path, body: { paymentId } },
        });
        return;
      }
      const data = await apiRequest("POST", path, { paymentId });
      output.success(stripHeavy(data));
    },
  );
