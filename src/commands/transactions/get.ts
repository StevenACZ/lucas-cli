import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const getTransactionCommand = new Command("get")
  .description("Get a single transaction by ID")
  .argument("<id>", "Transaction ID")
  .action(async (id: string) => {
    const data = await apiRequest("GET", resourcePath("/api/transactions", id));
    output.success(data);
  });
