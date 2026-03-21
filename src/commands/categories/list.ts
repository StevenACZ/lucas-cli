import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listCategoriesCommand = new Command("list")
  .description("List all categories")
  .action(async () => {
    const data = await apiRequest("GET", "/api/categories");
    output.success(data);
  });
