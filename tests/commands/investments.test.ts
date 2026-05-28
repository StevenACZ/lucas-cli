import { describe, expect, it } from "vitest";
import { buildArchivedItemsParams } from "../../src/commands/investments/archive.js";
import {
  buildCreateCashAdjustmentBody,
  buildUpdateCashAdjustmentBody,
} from "../../src/commands/investments/cash.js";
import {
  buildInstrumentListParams,
  buildInstrumentSearchParams,
} from "../../src/commands/investments/instruments.js";
import {
  buildInvestmentActivityParams,
  buildInvestmentHistoryParams,
} from "../../src/commands/investments/portfolio.js";
import { buildInvestmentRefreshParams } from "../../src/commands/investments/refresh.js";
import {
  buildCreateTradeBody,
  buildUpdateTradeBody,
} from "../../src/commands/investments/trades.js";

describe("investments commands", () => {
  it("builds instrument list filters", () => {
    expect(
      buildInstrumentListParams({
        limit: "25",
        offset: "10",
        rank: "popular",
        type: "ETF",
        exchange: "NASDAQ",
        inactive: true,
      }),
    ).toEqual({
      limit: "25",
      offset: "10",
      rank: "popular",
      type: "ETF",
      exchange: "NASDAQ",
      isActive: "false",
    });
  });

  it("builds instrument search params", () => {
    expect(buildInstrumentSearchParams("NVDA", { limit: "5" })).toEqual({
      q: "NVDA",
      limit: "5",
    });
  });

  it("builds activity filters", () => {
    expect(
      buildInvestmentActivityParams({
        limit: "20",
        offset: "40",
        kind: "trades",
      }),
    ).toEqual({
      limit: "20",
      offset: "40",
      kind: "trades",
    });
  });

  it("builds history filters", () => {
    expect(buildInvestmentHistoryParams({ range: "90d" })).toEqual({
      range: "90d",
    });
    expect(buildInvestmentHistoryParams({})).toBeUndefined();
  });

  it("builds create trade payload", () => {
    expect(
      buildCreateTradeBody({
        instrumentId: "inst-1",
        side: "buy",
        quantity: "2.5",
        price: "100",
        fee: "1.25",
        executedAt: "2026-05-28T03:00:00.000Z",
        notes: "Initial position",
      }),
    ).toEqual({
      instrumentId: "inst-1",
      side: "BUY",
      quantity: 2.5,
      price: 100,
      fee: 1.25,
      executedAt: "2026-05-28T03:00:00.000Z",
      notes: "Initial position",
    });
  });

  it("builds update trade payload and clear notes", () => {
    expect(
      buildUpdateTradeBody({
        price: "102.5",
        clearNotes: true,
      }),
    ).toEqual({
      price: 102.5,
      notes: null,
    });
  });

  it("builds cash adjustment payloads", () => {
    expect(
      buildCreateCashAdjustmentBody({
        amount: "250",
        occurredAt: "2026-05-28T03:00:00.000Z",
        note: "Deposit",
      }),
    ).toEqual({
      amount: 250,
      occurredAt: "2026-05-28T03:00:00.000Z",
      note: "Deposit",
    });

    expect(
      buildUpdateCashAdjustmentBody({
        amount: "-50",
        clearNote: true,
      }),
    ).toEqual({
      amount: -50,
      note: null,
    });
  });

  it("builds archived item filters", () => {
    expect(
      buildArchivedItemsParams({
        limit: "10",
        offset: "30",
        kind: "trade",
      }),
    ).toEqual({
      limit: "10",
      offset: "30",
      kind: "trade",
    });
  });

  it("builds refresh params", () => {
    expect(
      buildInvestmentRefreshParams({
        action: "catalog",
        exchanges: "NYSE,NASDAQ",
        country: "United States",
      }),
    ).toEqual({
      action: "catalog",
      exchanges: "NYSE,NASDAQ",
      country: "United States",
    });
  });
});
