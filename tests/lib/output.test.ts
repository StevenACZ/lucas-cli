import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command, Option } from "commander";
import {
  CliError,
  EXIT,
  exitCodeFor,
  requireYes,
} from "../../src/lib/errors.js";
import { output } from "../../src/lib/output.js";
import { runProgram } from "../../src/lib/program.js";

let written: string[] = [];

beforeEach(() => {
  written = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    written.push(String(chunk));
    return true;
  });
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`);
  }) as never);
  process.env.LUCAS_PRETTY = "0";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LUCAS_PRETTY;
});

function stdoutJson(): Record<string, unknown> {
  expect(written).toHaveLength(1);
  return JSON.parse(written[0]) as Record<string, unknown>;
}

describe("errors", () => {
  it("maps codes and HTTP statuses to exit codes", () => {
    expect(exitCodeFor("UNKNOWN_OPTION")).toBe(EXIT.USAGE);
    expect(exitCodeFor("CONFIRMATION_REQUIRED")).toBe(EXIT.USAGE);
    expect(exitCodeFor("TOKEN_EXPIRED")).toBe(EXIT.AUTH);
    expect(exitCodeFor(undefined, 404)).toBe(EXIT.NOT_FOUND);
    expect(exitCodeFor(undefined, 429)).toBe(EXIT.RATE_LIMITED);
    expect(exitCodeFor(undefined, 422)).toBe(EXIT.USAGE);
    expect(exitCodeFor(undefined, 500)).toBe(EXIT.FAILURE);
  });

  it("requires --yes for permanent actions", () => {
    expect(() => requireYes(true, "Deleting")).not.toThrow();
    expect(() => requireYes(undefined, "Deleting")).toThrow(
      expect.objectContaining({
        code: "CONFIRMATION_REQUIRED",
        hint: "Re-run with --yes",
      }),
    );
  });
});

describe("output", () => {
  it("prints one compact JSON document for success with meta", () => {
    output.success([{ id: 1 }], { count: 1 });

    expect(written[0]).toBe(
      '{"ok":true,"data":[{"id":1}],"meta":{"count":1}}\n',
    );
  });

  it("pretty prints when asked", () => {
    process.env.LUCAS_PRETTY = "1";
    output.success({ id: 1 });

    expect(written[0]).toContain('\n  "ok": true');
  });

  it("prints the error envelope and exits with its code", () => {
    expect(() =>
      output.fail(
        new CliError({ code: "NOT_FOUND", message: "No account", hint: "h" }),
      ),
    ).toThrow("exit 4");
    expect(stdoutJson()).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "No account", hint: "h" },
    });
  });
});

describe("runProgram", () => {
  function tree(action = vi.fn()): Command {
    const program = new Command("lucas");
    const accounts = program.command("accounts");
    accounts.addCommand(
      new Command("list")
        .option("--full", "Raw objects")
        .addOption(new Option("--legacy").hideHelp())
        .action(action),
    );
    return program;
  }

  it("turns an unknown option into JSON with the valid options and exit 2", async () => {
    await expect(
      runProgram(tree(), ["node", "lucas", "accounts", "list", "--bogus"]),
    ).rejects.toThrow("exit 2");

    const envelope = stdoutJson();
    expect(envelope).toMatchObject({
      ok: false,
      error: {
        code: "UNKNOWN_OPTION",
        hint: "Run: lucas accounts list --help",
        details: { validOptions: ["--full"] },
      },
    });
  });

  it("reports an unknown command with the available ones", async () => {
    await expect(
      runProgram(tree(), ["node", "lucas", "accounts", "lst"]),
    ).rejects.toThrow("exit 2");

    expect(stdoutJson()).toMatchObject({
      error: { code: "UNKNOWN_COMMAND", details: { commands: ["list"] } },
    });
  });

  it("serializes a thrown CliError from an action", async () => {
    const action = vi.fn(() => {
      throw new CliError({ code: "AMBIGUOUS", message: "Two matches" });
    });

    await expect(
      runProgram(tree(action), ["node", "lucas", "accounts", "list"]),
    ).rejects.toThrow("exit 2");

    expect(stdoutJson()).toMatchObject({
      ok: false,
      error: { code: "AMBIGUOUS", message: "Two matches" },
    });
  });
});
