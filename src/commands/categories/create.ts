import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { hexColor } from "../../lib/loan-appearance.js";
import { output } from "../../lib/output.js";
import { categoryView } from "../../lib/views.js";

export const createCategoryCommand = new Command("create")
  .description("Create a custom category")
  .requiredOption("--name <name>", "Category name")
  .requiredOption("--icon <icon>", "Category icon name")
  .requiredOption("--color <color>", "Category color (#RRGGBB)", hexColor)
  .option("--dry-run", "Validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Examples:
  lucas categories create --name "Pets" --icon paw --color "#F59E0B"
`,
  )
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "icon", body: "icon" },
      { opt: "color", body: "color" },
    ]);
    if (opts.dryRun) {
      output.success({
        dryRun: true,
        request: { method: "POST", path: "/api/categories", body },
      });
      return;
    }
    const category = await apiRequest<Record<string, unknown>>(
      "POST",
      "/api/categories",
      body,
    );
    output.success({ category: categoryView(category) });
  });
