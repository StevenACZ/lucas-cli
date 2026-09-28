import { Command } from "commander";
import { choice } from "../../lib/choices.js";
import { output } from "../../lib/output.js";
import { loadCategories, normalizeName } from "../../lib/resolve.js";
import { categoryView } from "../../lib/views.js";

export const listCategoriesCommand = new Command("list")
  .description("List categories (default and custom)")
  .option("--type <type>", "INCOME or EXPENSE", choice(["INCOME", "EXPENSE"]))
  .option("--search <text>", "Name or slug contains (accent/case-insensitive)")
  .action(async (opts: { type?: string; search?: string }) => {
    const wanted = normalizeName(opts.search);
    const rows = (await loadCategories()).filter(
      (category) =>
        (!opts.type || category.type === opts.type) &&
        (!wanted ||
          normalizeName(category.name).includes(wanted) ||
          normalizeName(category.slug).includes(wanted)),
    );
    output.success(rows.map(categoryView), { count: rows.length });
  });
