import { describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

const { buildCreateAccountBody } =
  await import("../../src/commands/accounts/create.js");

describe("accounts vault flag", () => {
  it("omits vault when the flag is not passed", () => {
    const body = buildCreateAccountBody({
      name: "ITK Soles",
      type: "DEBIT",
      bank: "Interbank",
    });
    expect(body).not.toHaveProperty("vault");
  });

  it("sends vault true when --vault is passed", () => {
    const body = buildCreateAccountBody({
      name: "Ahorro carro",
      type: "SAVINGS",
      bank: "Interbank",
      vault: true,
    });
    expect(body).toMatchObject({ type: "SAVINGS", vault: true });
  });
});
