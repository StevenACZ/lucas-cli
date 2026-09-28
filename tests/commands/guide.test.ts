import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Command } from "commander";

const outputSuccess = vi.fn();

vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));

const { buildProgram } = await import("../../src/cli.js");
const { GUIDES, guideCommand } = await import("../../src/commands/guide.js");
const { commandCatalog } = await import("../../src/commands/catalog.js");

const program = await buildProgram();

function tokenize(command: string): string[] {
  return [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function leafFor(tokens: string[]): { leaf: Command; path: string } {
  expect(tokens[0]).toBe("lucas");
  let current = program;
  const names: string[] = [];
  for (const token of tokens.slice(1)) {
    if (current.commands.length === 0) break;
    const next = current.commands.find((child) => child.name() === token);
    if (!next) {
      throw new Error(`Unknown command "${token}" under "${current.name()}"`);
    }
    names.push(token);
    current = next;
  }
  expect(current.commands, `"${names.join(" ")}" is not a leaf`).toEqual([]);
  return { leaf: current, path: names.join(" ") };
}

function flags(tokens: string[]): string[] {
  return tokens
    .filter((token) => token.startsWith("--"))
    .map((token) => token.split("=")[0]);
}

const steps = Object.entries(GUIDES).flatMap(([topic, guide]) =>
  guide.steps.map((step, index) => ({ topic, index, command: step.command })),
);

describe("guide", () => {
  beforeEach(() => {
    outputSuccess.mockReset();
  });

  it("covers the agreed topics", () => {
    expect(Object.keys(GUIDES)).toEqual([
      "expense",
      "card-purchase",
      "card-payment",
      "transfer",
      "loan-payment",
      "subscription-charge",
      "undo",
      "bulk-import",
    ]);
    for (const guide of Object.values(GUIDES)) {
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.mistakes.length).toBeGreaterThan(0);
    }
  });

  it.each(steps)(
    "$topic step $index uses a real command and declared flags",
    ({ command }) => {
      const tokens = tokenize(command);
      const { leaf, path } = leafFor(tokens);
      const declared = new Set(
        leaf.options.flatMap((option) => [option.long, option.short]),
      );
      for (const flag of flags(tokens)) {
        expect(declared.has(flag), `${flag} is not an option of ${path}`).toBe(
          true,
        );
      }
    },
  );

  it.each(Object.keys(GUIDES))(
    "%s shows --dry-run before every write that supports it",
    (topic) => {
      const seen = new Set<string>();
      for (const step of GUIDES[topic].steps) {
        const tokens = tokenize(step.command);
        const { leaf, path } = leafFor(tokens);
        const supportsDryRun = leaf.options.some(
          (option) => option.long === "--dry-run",
        );
        if (flags(tokens).includes("--dry-run")) seen.add(path);
        else if (supportsDryRun) {
          expect(seen.has(path), `${path} needs a --dry-run step first`).toBe(
            true,
          );
        }
      }
    },
  );

  it("is listed in the commands catalog", () => {
    expect(commandCatalog(program)).toContainEqual(
      expect.objectContaining({
        command: "lucas guide",
        arguments: [expect.objectContaining({ name: "topic" })],
      }),
    );
  });

  it("lists the topics without an argument", async () => {
    await guideCommand.parseAsync([], { from: "user" });
    const [rows, meta] = outputSuccess.mock.calls[0];
    expect(meta).toEqual({ count: Object.keys(GUIDES).length });
    expect(rows[0]).toEqual({
      topic: "expense",
      title: GUIDES.expense.title,
      when: GUIDES.expense.when,
    });
  });

  it("prints one guide for a topic", async () => {
    await guideCommand.parseAsync(["loan-payment"], { from: "user" });
    expect(outputSuccess).toHaveBeenCalledWith({
      topic: "loan-payment",
      ...GUIDES["loan-payment"],
    });
  });
});
