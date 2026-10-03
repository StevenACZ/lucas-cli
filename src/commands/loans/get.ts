import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { compactParams } from "../../lib/query-params.js";
import { resolveLoanId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const getLoanCommand = new Command("get")
  .description("Get one loan with installments and payments")
  .argument("<loan>", "Loan name or id")
  .option(
    "--payment-date <date>",
    "Quote what is owed if paid on this date (YYYY-MM-DD), late fees included",
  )
  .action(runGetLoan);

export async function runGetLoan(
  ref: string,
  opts: { paymentDate?: string } = {},
): Promise<void> {
  const accepted = ["today", "yesterday", "YYYY-MM-DD"];
  let paymentDate: string | undefined;
  try {
    paymentDate = parseDateOption(opts.paymentDate, "--payment-date");
  } catch {
    throw invalidValue(`Invalid date for --payment-date: ${opts.paymentDate}`, {
      accepted,
    });
  }
  if (paymentDate && !DATE_ONLY.test(paymentDate)) {
    throw invalidValue("--payment-date takes a date without a time", {
      accepted,
    });
  }
  const id = await resolveLoanId(ref);
  const data = await apiRequest(
    "GET",
    resourcePath("/api/loans", id),
    undefined,
    compactParams({ paymentDate }),
  );
  output.success(stripHeavy(data));
}
