import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const success = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success, error: vi.fn() },
}));

async function runUpdate(args: string[]) {
  vi.resetModules();
  const { settingsCommand } =
    await import("../../src/commands/settings/index.js");
  await settingsCommand.parseAsync(["update", ...args], { from: "user" });
}

describe("settings update", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ theme: "dark" });
    success.mockReset();
  });

  it("sends every general and AI field", async () => {
    await runUpdate([
      "--exchange-rate",
      "3.75",
      "--auto-exchange",
      "--show-excluded-accounts",
      "--theme",
      "DARK",
      "--primary-timezone",
      "America/Lima",
      "--language",
      "en",
      "--ai-enabled",
      "--ai-smart-features-enabled",
      "--ai-custom-context",
      "I am paid on the 30th",
    ]);

    expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/settings", {
      exchangeRate: 3.75,
      autoExchange: true,
      showExcludedAccounts: true,
      theme: "dark",
      primaryTimezone: "America/Lima",
      language: "en",
      aiEnabled: true,
      aiSmartFeaturesEnabled: true,
      aiCustomContext: "I am paid on the 30th",
    });
  });

  it("sends false for the --no- flags and clears the AI context", async () => {
    await runUpdate([
      "--no-auto-exchange",
      "--no-show-excluded-accounts",
      "--no-ai-enabled",
      "--no-ai-smart-features-enabled",
      "--ai-custom-context",
      "",
    ]);

    expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/settings", {
      autoExchange: false,
      showExcludedAccounts: false,
      aiEnabled: false,
      aiSmartFeaturesEnabled: false,
      aiCustomContext: "",
    });
  });

  it("rejects an update without options", async () => {
    await expect(runUpdate([])).rejects.toMatchObject({
      code: "INVALID_VALUE",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("does not expose AI consent", async () => {
    vi.resetModules();
    const { settingsCommand } =
      await import("../../src/commands/settings/index.js");
    const update = settingsCommand.commands.find(
      (command) => command.name() === "update",
    );

    expect(
      update?.options.filter((option) => option.long?.includes("consent")),
    ).toEqual([]);
  });
});
