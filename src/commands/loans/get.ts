import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resolveLoanId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export const getLoanCommand = new Command("get")
  .description("Get one loan with installments and payments")
  .argument("<loan>", "Loan name or id")
  .action(async (ref: string) => {
    const id = await resolveLoanId(ref);
    const data = await apiRequest("GET", resourcePath("/api/loans", id));
    output.success(stripHeavy(data));
  });
