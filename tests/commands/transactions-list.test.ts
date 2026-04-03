import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: vi.fn(),
  },
}));

const { listTransactionsCommand } =
  await import("../../src/commands/transactions/list.js");

describe("transactions list command", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("maps legacy CLI flags to canonical transaction filter query params", async () => {
    apiRequest.mockResolvedValue([]);

    await listTransactionsCommand.parseAsync(
      [
        "--from",
        "2026-04-01",
        "--to",
        "2026-04-30",
        "--skip",
        "5",
        "--take",
        "10",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/transactions",
      undefined,
      {
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        offset: "5",
        limit: "10",
      },
    );
  });
});
