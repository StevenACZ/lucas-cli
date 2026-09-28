import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { fetchTransfer } from "./get.js";

type Row = Record<string, unknown>;

export const deleteTransferCommand = new Command("delete")
  .description("Move a transfer to the trash (restore with lucas trash)")
  .argument("<id>", "Transfer id")
  .addOption(new Option("--yes").hideHelp())
  .action(async (id: string) => {
    const transfer = await fetchTransfer(id);
    await apiRequest("DELETE", resourcePath("/api/transfers", id));
    const accounts = await accountsAfterWrite([
      (transfer.from as Row | null)?.id as string | undefined,
      (transfer.to as Row | null)?.id as string | undefined,
    ]);
    output.success({ deleted: transfer, accounts });
  });
