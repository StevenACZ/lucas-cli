import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const payLoanCommand = new Command("pay")
  .description("Make a loan payment")
  .argument("<id>", "Loan ID")
  .requiredOption("--amount <amount>", "Payment amount")
  .action(async (id: string, opts) => {
    const body = { amount: Number(opts.amount) };
    const data = await apiRequest("POST", `/api/loans/${id}/pay`, body);
    output.success(data);
  });
