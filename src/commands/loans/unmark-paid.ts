import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface LoanPayment {
  id: string;
  paidAt: string;
  payAmount: number;
  loanAmount: number;
  payCurrency: string;
}

interface LoanDetails {
  id: string;
  payments: LoanPayment[];
}

export const unmarkPaidLoanCommand = new Command("unmark-paid")
  .description("Reverse a loan payment (default: most recent)")
  .argument("<id>", "Loan ID")
  .option("--payment-id <id>", "Specific payment ID to reverse")
  .addHelpText(
    "after",
    "\nExamples:\n  lucas loans unmark-paid <loan-id>\n  lucas loans unmark-paid <loan-id> --payment-id <payment-id>\n",
  )
  .action(async (id: string, opts: { paymentId?: string }) => {
    let paymentId = opts.paymentId;

    if (!paymentId) {
      const loan = await apiRequest<LoanDetails>("GET", `/api/loans/${id}`);
      if (!loan.payments || loan.payments.length === 0) {
        output.error("No payments found for this loan", 404, { loanId: id });
      }
      const sorted = [...loan.payments].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );
      paymentId = sorted[0].id;
    }

    const data = await apiRequest("POST", `/api/loans/${id}/reverse-payment`, {
      paymentId,
    });
    output.success(data);
  });
