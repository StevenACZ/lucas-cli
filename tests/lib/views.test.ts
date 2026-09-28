import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountView,
  categoryView,
  stripHeavy,
  transactionView,
  transferView,
} from "../../src/lib/views.js";

describe("views", () => {
  beforeEach(() => {
    process.env.LUCAS_TZ = "America/Lima";
  });

  afterEach(() => {
    delete process.env.LUCAS_TZ;
  });

  it("drops every Base64 key and ocrRawResponse at any depth", () => {
    expect(
      stripHeavy({
        a: 1,
        imageBase64: "x",
        nested: [{ logoBase64: "y", ocrRawResponse: {}, keep: true }],
      }),
    ).toEqual({ a: 1, nested: [{ keep: true }] });
  });

  it("projects a credit account with numbers and availableCredit", () => {
    expect(
      accountView({
        id: "a",
        name: "Visa",
        bank: "BCP",
        type: "CREDIT",
        currency: "PEN",
        balance: "0",
        creditLimit: "5000.00",
        currentDebt: "-20",
        statementClosingDay: 20,
        isArchived: false,
        color: "#fff",
      }),
    ).toEqual({
      id: "a",
      name: "Visa",
      bank: "BCP",
      type: "CREDIT",
      currency: "PEN",
      balance: 0,
      currentDebt: -20,
      creditLimit: 5000,
      availableCredit: 5020,
      statementClosingDay: 20,
      vault: false,
      excluded: false,
      archived: false,
    });
  });

  it("adds localDate and compact refs to transactions", () => {
    expect(
      transactionView({
        id: "t",
        date: "2026-09-01T17:00:00.000Z",
        type: "EXPENSE",
        amount: "12.50",
        description: "Taxi",
        account: { id: "a", name: "Soles", currency: "PEN", bank: "IBK" },
        category: { id: "c", name: "Transport", icon: "car" },
        notes: null,
        ocrRawResponse: {},
      }),
    ).toEqual({
      id: "t",
      date: "2026-09-01T17:00:00.000Z",
      localDate: "2026-09-01 12:00",
      type: "EXPENSE",
      amount: 12.5,
      currency: "PEN",
      description: "Taxi",
      account: { id: "a", name: "Soles", currency: "PEN" },
      category: { id: "c", name: "Transport" },
    });
  });

  it("builds a transfer from the backend record with string money", () => {
    expect(
      transferView({
        id: "tr",
        date: "2026-09-01T17:00:00.000Z",
        amount: "370.00",
        toAmount: "100.00",
        exchangeRate: "0.2703",
        description: null,
        notes: "Rent",
        fromAccountId: "a",
        toAccountId: "b",
        fromAccount: { id: "a", name: "Soles", currency: "PEN" },
        toAccount: { id: "b", name: "Dólares", currency: "USD" },
      }),
    ).toEqual({
      id: "tr",
      date: "2026-09-01T17:00:00.000Z",
      localDate: "2026-09-01 12:00",
      amount: 370,
      toAmount: 100,
      exchangeRate: 0.2703,
      description: null,
      notes: "Rent",
      from: { id: "a", name: "Soles", currency: "PEN" },
      to: { id: "b", name: "Dólares", currency: "USD" },
    });
  });

  it("defaults toAmount to amount for same-currency transfers", () => {
    expect(
      transferView({
        id: "tr",
        amount: 50,
        toAmount: null,
        exchangeRate: null,
      }),
    ).toMatchObject({ amount: 50, toAmount: 50, exchangeRate: null });
  });

  it("marks custom categories", () => {
    expect(
      categoryView({ id: "c", name: "Food", type: "EXPENSE", slug: "food" }),
    ).toMatchObject({ custom: true });
  });
});
