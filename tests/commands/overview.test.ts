import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

const apiRequest = vi.fn();
const apiRequestOrThrow = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
  apiRequestOrThrow,
}));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));

const { overviewCommand } = await import("../../src/commands/overview.js");
const { commandCatalog, commandsCommand } =
  await import("../../src/commands/catalog.js");

describe("lucas overview", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequestOrThrow.mockReset();
    outputSuccess.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T17:00:00.000Z"));
    process.env.LUCAS_TZ = "America/Lima";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.LUCAS_TZ;
  });

  it("combines accounts, totals, the current month and pending charges", async () => {
    apiRequest.mockImplementation(async (_method: string, path: string) => {
      if (path === "/api/accounts") {
        return {
          accounts: [
            {
              id: "a",
              name: "Soles",
              type: "DEBIT",
              currency: "PEN",
              balance: "10",
            },
          ],
          balancesByCurrency: { PEN: 10 },
          debtByCurrency: {},
        };
      }
      return {
        monthlyIncome: 100,
        monthlyExpense: 40,
        monthlyNet: 60,
        flowsByCurrency: { PEN: { monthlyIncome: 100 } },
      };
    });
    apiRequestOrThrow.mockResolvedValue({ summary: { total: 3 } });

    await overviewCommand.parseAsync([], { from: "user" });

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/stats/summary",
      undefined,
      {
        year: "2026",
        month: "9",
      },
    );
    expect(outputSuccess).toHaveBeenCalledWith({
      accounts: [expect.objectContaining({ id: "a", balance: 10 })],
      totals: { balancesByCurrency: { PEN: 10 }, debtByCurrency: {} },
      month: {
        year: 2026,
        month: 9,
        income: 100,
        expense: 40,
        net: 60,
        flowsByCurrency: { PEN: { monthlyIncome: 100 } },
      },
      pendingCharges: 3,
    });
  });

  it("reports pendingCharges null when that read fails", async () => {
    apiRequest.mockResolvedValue({});
    apiRequestOrThrow.mockRejectedValue(new Error("boom"));

    await overviewCommand.parseAsync([], { from: "user" });

    expect(outputSuccess.mock.calls[0][0].pendingCharges).toBeNull();
  });
});

describe("lucas commands", () => {
  it("lists every leaf command with arguments and visible options", () => {
    const program = new Command("lucas");
    const accounts = program.command("accounts").description("Accounts");
    accounts
      .command("get")
      .description("Get one")
      .argument("<account>", "Account name or id")
      .option("--full", "Raw")
      .option("--limit <n>", "Rows", "50");
    accounts.command("hidden-flag").option("--x");
    accounts.commands[1].options[0].hideHelp();

    expect(commandCatalog(program)).toEqual([
      {
        command: "lucas accounts get",
        description: "Get one",
        arguments: [
          {
            name: "account",
            description: "Account name or id",
            required: true,
            variadic: false,
          },
        ],
        options: [
          { flags: "--full", description: "Raw", required: false },
          {
            flags: "--limit <n>",
            description: "Rows",
            required: false,
            default: "50",
          },
        ],
      },
      {
        command: "lucas accounts hidden-flag",
        description: "",
        arguments: [],
        options: [],
      },
    ]);
  });

  it("walks up to the root from its own action", async () => {
    outputSuccess.mockReset();
    const program = new Command("lucas");
    program.addCommand(commandsCommand);

    await program.parseAsync(["commands"], { from: "user" });

    const [data, meta] = outputSuccess.mock.calls[0];
    expect(data.map((row: { command: string }) => row.command)).toEqual([
      "lucas commands",
    ]);
    expect(meta).toEqual({ count: 1 });
  });
});
