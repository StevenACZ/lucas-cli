import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { extractItems } from "../../lib/types.js";
import { stripHeavy } from "../../lib/views.js";

export const listLoansCommand = new Command("list")
  .description("List loans with installments and payments")
  .action(async () => {
    const rows = stripHeavy(
      extractItems<Record<string, unknown>>(
        await apiRequest("GET", "/api/loans"),
        ["items", "loans"],
      ) ?? [],
    );
    output.success(rows, { count: rows.length });
  });
