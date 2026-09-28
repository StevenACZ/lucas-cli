import { Command } from "commander";
import { output } from "../lib/output.js";

type Row = Record<string, unknown>;

export function commandCatalog(root: Command): Row[] {
  const rows: Row[] = [];
  const visit = (command: Command, path: string[]) => {
    for (const child of command.commands) {
      const childPath = [...path, child.name()];
      if (child.commands.length === 0) {
        rows.push({
          command: childPath.join(" "),
          description: child.description(),
          arguments: child.registeredArguments.map((argument) => ({
            name: argument.name(),
            description: argument.description,
            required: argument.required,
            variadic: argument.variadic,
          })),
          options: child.options
            .filter((option) => !option.hidden)
            .map((option) => ({
              flags: option.flags,
              description: option.description,
              required: option.mandatory,
              ...(option.defaultValue !== undefined && {
                default: option.defaultValue,
              }),
            })),
        });
      }
      visit(child, childPath);
    }
  };
  visit(root, [root.name()]);
  return rows;
}

export const commandsCommand = new Command("commands")
  .description("JSON catalog of every command, argument and option")
  .action((_opts: unknown, command: Command) => {
    let root = command;
    while (root.parent) root = root.parent;
    const rows = commandCatalog(root);
    output.success(rows, { count: rows.length });
  });
