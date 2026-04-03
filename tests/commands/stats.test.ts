import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

const { summaryCommand } = await import("../../src/commands/stats/summary.js");

describe("stats commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("passes optional month and year to stats summary", async () => {
    apiRequest.mockResolvedValue({});

    await summaryCommand.parseAsync(
      ["--year", "2026", "--month", "3", "--currency", "PEN"],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/stats/summary",
      undefined,
      {
        currency: "PEN",
        year: "2026",
        month: "3",
      },
    );
  });

  it("rejects invalid months for stats summary", async () => {
    apiRequest.mockResolvedValue({});

    await expect(
      summaryCommand.parseAsync(["--month", "13"], { from: "user" }),
    ).rejects.toThrow("Invalid value for --month");
  });
});
