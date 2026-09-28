import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { extractItems } from "../../lib/types.js";
import { groupTransferLegs } from "./list.js";

type Row = Record<string, unknown>;

export async function fetchTransfer(id: string): Promise<Row> {
  const legs = await apiRequest<unknown>(
    "GET",
    resourcePath("/api/transfers", id),
  );
  return (
    groupTransferLegs(extractItems<Row>(legs, ["items"]) ?? [])[0] ?? { id }
  );
}

export const getTransferCommand = new Command("get")
  .description("Get one transfer with both accounts")
  .argument("<id>", "Transfer id")
  .action(async (id: string) => {
    output.success(await fetchTransfer(id));
  });
