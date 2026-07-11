import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const bcrCommand = new Command("bcr")
  .description("USD to PEN reference rate (BCR)")
  .action(async () => {
    const data = await apiRequest("GET", "/api/exchange-rate/bcr");
    output.success(data);
  });
