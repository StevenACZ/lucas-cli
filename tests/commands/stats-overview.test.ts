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

const { overviewCommand } =
  await import("../../src/commands/stats/overview.js");

describe("stats overview command", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("passes period, currency, and offset as query params", async () => {
    const response = { period: "WEEK", current: {}, previous: {} };
    apiRequest.mockResolvedValue(response);

    await overviewCommand.parseAsync(
      ["--period", "week", "--currency", "PEN", "--offset", "2"],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/stats/overview",
      undefined,
      { period: "WEEK", currency: "PEN", offset: "2" },
    );
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("defaults to the MONTH period", async () => {
    apiRequest.mockResolvedValue({});

    await overviewCommand.parseAsync([], { from: "user" });

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/stats/overview",
      undefined,
      { period: "MONTH" },
    );
  });

  it("rejects negative offsets", async () => {
    await expect(
      overviewCommand.parseAsync(["--offset", "-1"], { from: "user" }),
    ).rejects.toThrow("Invalid value for --offset");

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
