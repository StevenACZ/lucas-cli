import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

const { buildCreateAccountBody } =
  await import("../../src/commands/accounts/create.js");
const { updateAccountCommand } =
  await import("../../src/commands/accounts/update.js");

describe("accounts create", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("buildCreateAccountBody includes statementClosingDay for CREDIT", () => {
    expect(
      buildCreateAccountBody({
        name: "Visa",
        type: "CREDIT",
        bank: "BCP",
        currency: "PEN",
        creditLimit: "5000",
        statementClosingDay: "5",
      }),
    ).toMatchObject({
      name: "Visa",
      type: "CREDIT",
      bank: "BCP",
      currency: "PEN",
      creditLimit: 5000,
      statementClosingDay: 5,
    });
  });

  it("buildCreateAccountBody omits statementClosingDay for non-CREDIT", () => {
    const body = buildCreateAccountBody({
      name: "Savings",
      type: "DEBIT",
      bank: "BCP",
      currency: "PEN",
      statementClosingDay: "5",
    });
    expect(body).not.toHaveProperty("statementClosingDay");
  });

  it("buildCreateAccountBody rejects non-integer statementClosingDay", () => {
    expect(() =>
      buildCreateAccountBody({
        name: "Visa",
        type: "CREDIT",
        bank: "BCP",
        currency: "PEN",
        creditLimit: "5000",
        statementClosingDay: "bad",
      }),
    ).toThrow();
  });

  it("buildCreateAccountBody rejects statementClosingDay out of range", () => {
    expect(() =>
      buildCreateAccountBody({
        name: "Visa",
        type: "CREDIT",
        bank: "BCP",
        currency: "PEN",
        creditLimit: "5000",
        statementClosingDay: "32",
      }),
    ).toThrow();
  });

  it("account update exposes backend currency edits", () => {
    const currencyOption = updateAccountCommand.options.find(
      (option) => option.long === "--currency",
    );

    expect(currencyOption?.description).toBe("Currency code");
  });
});
