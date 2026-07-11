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

const { trashCommand } = await import("../../src/commands/trash/index.js");

describe("trash commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("fetches the trash summary", async () => {
    const response = { accounts: 1, transactions: 2, transfers: 0, total: 3 };
    apiRequest.mockResolvedValue(response);

    await trashCommand.parseAsync(["summary"], { from: "user" });

    expect(apiRequest).toHaveBeenCalledWith("GET", "/api/trash/summary");
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("lists trashed transactions with pagination", async () => {
    apiRequest.mockResolvedValue([]);

    await trashCommand.parseAsync(
      ["transactions", "--limit", "20", "--offset", "5"],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/transactions/trash",
      undefined,
      { limit: "20", offset: "5" },
    );
  });

  it("restores a trashed transaction", async () => {
    const response = { success: true, restoredIds: ["tx_1"] };
    apiRequest.mockResolvedValue(response);

    await trashCommand.parseAsync(["restore-transaction", "tx_1"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/transactions/tx_1/restore",
    );
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("restores a trashed transfer", async () => {
    apiRequest.mockResolvedValue({ success: true });

    await trashCommand.parseAsync(["restore-transfer", "tr_1"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/transfers/tr_1/restore",
    );
  });

  it("permanently deletes a trashed transfer", async () => {
    apiRequest.mockResolvedValue({ success: true });

    await trashCommand.parseAsync(["permanent-delete-transfer", "tr_1"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/transfers/tr_1/permanent",
    );
  });
});
