import { Command } from "commander";
import { LOAN_ICONS } from "../../lib/loan-appearance.js";
import { output } from "../../lib/output.js";

export const loanIconsCommand = new Command("icons")
  .description("List the loan icon names and their default colors")
  .action(() => {
    output.success(LOAN_ICONS, { count: LOAN_ICONS.length });
  });
