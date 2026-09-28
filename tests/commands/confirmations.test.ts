import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Command } from "commander";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccount: async (ref: string) => ({ id: ref, name: ref }),
  resolveLoanId: async (ref: string) => ref,
  resolveSubscriptionId: async (ref: string) => ref,
}));

const { deleteAccountCommand } =
  await import("../../src/commands/accounts/delete.js");
const { deleteLoanCommand } =
  await import("../../src/commands/loans/delete.js");
const { deleteSubscriptionCommand } =
  await import("../../src/commands/subscriptions/delete.js");
const { subscriptionGroupsCommand } =
  await import("../../src/commands/subscription-groups/index.js");

const { deleteTransactionCommand } =
  await import("../../src/commands/transactions/delete.js");
const { deleteTransferCommand } =
  await import("../../src/commands/transfers/delete.js");

const cases: Array<[string, Command, string[], string]> = [
  ["accounts delete", deleteAccountCommand, ["acc_1"], "/api/accounts/acc_1"],
  ["loans delete", deleteLoanCommand, ["loan_1"], "/api/loans/loan_1"],
  [
    "subscriptions delete",
    deleteSubscriptionCommand,
    ["sub_1"],
    "/api/subscriptions/sub_1",
  ],
  [
    "subscription-groups delete",
    subscriptionGroupsCommand,
    ["delete", "grp_1"],
    "/api/subscription-groups/grp_1",
  ],
];

describe("--yes guards", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ success: true });
  });

  it.each(cases)("%s refuses without --yes", async (_name, command, args) => {
    await expect(
      command.parseAsync(args, { from: "user" }),
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      exitCode: 2,
      hint: "Re-run with --yes",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each(cases)(
    "%s deletes with --yes",
    async (_name, command, args, path) => {
      await command.parseAsync([...args, "--yes"], { from: "user" });
      expect(apiRequest).toHaveBeenCalledWith("DELETE", path);
    },
  );
});

describe("soft deletes", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ success: true });
  });

  it.each([
    ["transactions delete", deleteTransactionCommand, "/api/transactions/tx_1"],
    ["transfers delete", deleteTransferCommand, "/api/transfers/tx_1"],
  ] as Array<[string, Command, string]>)(
    "%s accepts --yes as a no-op",
    async (_name, command, path) => {
      await command.parseAsync(["tx_1", "--yes"], { from: "user" });
      expect(apiRequest).toHaveBeenCalledWith("DELETE", path);
    },
  );
});
