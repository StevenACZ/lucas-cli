import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { accountView, stripHeavy } from "../../lib/views.js";

export const getAccountCommand = new Command("get")
  .description("Get one account with a fresh balance and debt")
  .argument("<account>", "Account name or id")
  .option("--full", "Print the raw backend object")
  .action(async (ref: string, opts: { full?: boolean }) => {
    const id = String(await resolveAccountId(ref));
    const account = await apiRequest<Record<string, unknown>>(
      "GET",
      resourcePath("/api/accounts", id),
    );
    output.success(opts.full ? stripHeavy(account) : accountView(account));
  });
