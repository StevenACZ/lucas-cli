import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const updateAccountCommand = new Command("update")
  .description("Update an account")
  .argument("<id>", "Account ID")
  .option("--name <name>", "Account name")
  .option("--bank <bank>", "Bank name")
  .option("--color <color>", "Account color")
  .option("--icon <icon>", "Account icon")
  .action(async (id: string, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.name) body.name = opts.name;
    if (opts.bank) body.bank = opts.bank;
    if (opts.color) body.color = opts.color;
    if (opts.icon) body.icon = opts.icon;

    const data = await apiRequest("PUT", `/api/accounts/${id}`, body);
    output.success(data);
  });
