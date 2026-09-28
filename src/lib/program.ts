import { Command, CommanderError } from "commander";
import { ApiError } from "./api-client.js";
import { CliError, codeForStatus, EXIT } from "./errors.js";
import { output } from "./output.js";

const COMMANDER_CODES: Record<string, string> = {
  "commander.unknownOption": "UNKNOWN_OPTION",
  "commander.unknownCommand": "UNKNOWN_COMMAND",
  "commander.missingMandatoryOptionValue": "MISSING_OPTION",
  "commander.optionMissingArgument": "MISSING_OPTION",
  "commander.missingArgument": "MISSING_ARGUMENT",
  "commander.excessArguments": "USAGE",
  "commander.invalidArgument": "INVALID_VALUE",
  "commander.conflictingOption": "USAGE",
};

const QUIET_EXITS = new Set([
  "commander.helpDisplayed",
  "commander.help",
  "commander.version",
  "commander.executeSubCommandAsync",
]);

// Commander only copies exitOverride/configureOutput to subcommands created
// with .command(); commands attached with addCommand() need them explicitly.
export function hardenCommandTree(command: Command): void {
  command.exitOverride();
  command.configureOutput({ outputError: () => {} });
  command.showSuggestionAfterError(true);
  for (const child of command.commands) hardenCommandTree(child);
}

export function commandPath(program: Command, argv: string[]): Command[] {
  const path: Command[] = [program];
  let current = program;
  for (const token of argv) {
    if (token.startsWith("-")) continue;
    const next = current.commands.find(
      (child) => child.name() === token || child.aliases().includes(token),
    );
    if (!next) break;
    path.push(next);
    current = next;
  }
  return path;
}

function optionFlags(command: Command): string[] {
  return command.options
    .filter((option) => !option.hidden)
    .map((option) => option.long ?? option.short ?? option.flags);
}

function usageError(
  error: CommanderError,
  program: Command,
  argv: string[],
): CliError {
  const path = commandPath(program, argv);
  const target = path[path.length - 1];
  const name = path.map((command) => command.name()).join(" ");
  const code = COMMANDER_CODES[error.code] ?? "USAGE";
  const message = error.message.replace(/^error:\s*/i, "").trim();
  const details =
    code === "UNKNOWN_OPTION"
      ? { validOptions: optionFlags(target) }
      : code === "UNKNOWN_COMMAND" ||
          (code === "USAGE" && target.commands.length)
        ? { commands: target.commands.map((command) => command.name()) }
        : undefined;
  return new CliError({
    code,
    message,
    hint: `Run: ${name} --help`,
    details,
    exitCode: EXIT.USAGE,
  });
}

export function toCliError(
  error: unknown,
  program: Command,
  argv: string[],
): CliError | null {
  if (error instanceof CliError) return error;
  if (error instanceof CommanderError) {
    if (QUIET_EXITS.has(error.code)) return null;
    return usageError(error, program, argv);
  }
  if (error instanceof ApiError) {
    const details = error.details as Record<string, unknown> | undefined;
    const code =
      (typeof details?.code === "string" && details.code) ||
      codeForStatus(error.statusCode);
    return new CliError({
      code,
      message: error.message,
      status: error.statusCode,
      details,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new CliError({ code: "INTERNAL", message, exitCode: EXIT.FAILURE });
}

export async function runProgram(
  program: Command,
  argv: string[] = process.argv,
): Promise<void> {
  hardenCommandTree(program);
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const userArgs = argv.slice(2);
    const cliError = toCliError(error, program, userArgs);
    if (!cliError) {
      const exitCode =
        error instanceof CommanderError ? error.exitCode : EXIT.OK;
      process.exit(exitCode);
    }
    output.fail(cliError);
  }
}
