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
  buildInvestmentHistoryBackfillBody,
  buildInvestmentHistoryParams,
} from "../../src/commands/investments/portfolio.js";
import { buildInvestmentRefreshParams } from "../../src/commands/investments/refresh.js";
import { buildHapiImportPayload } from "../../src/commands/investments/import.js";
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

  it("builds symbol trade payloads", () => {
    expect(
      buildCreateTradeBody({
        symbol: "AAPL",
        side: "buy",
        quantity: "0.5",
        price: "200",
      }),
    ).toEqual({
      symbol: "AAPL",
      side: "BUY",
      quantity: 0.5,
      price: 200,
      fee: 0,
      executedAt: expect.any(String),
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
        type: "DEPOSIT",
      }),
    ).toEqual({
      amount: 250,
      occurredAt: "2026-05-28T03:00:00.000Z",
      note: "Deposit",
      type: "DEPOSIT",
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

  it("builds history backfill body", () => {
    expect(
      buildInvestmentHistoryBackfillBody({
        range: "ytd",
        quoteMode: "missing",
      }),
    ).toEqual({ range: "ytd", quoteMode: "missing" });
  });

  it("normalizes Hapi investment JSON for import", () => {
    const payload = buildHapiImportPayload(
      {
        monthly_log: [
          {
            month: "2026-04-01",
            deposit_received: 399.99,
            notes: "Initial deposit",
          },
        ],
        income_taxes: [
          {
            event_date: "2026-05-15",
            ticker: "AAPL",
            net_amount: 0.03,
          },
        ],
        transactions: [
          {
            trade_date: "2026-04-13",
            ticker: "VOO",
            quantity: 0.07013,
            price_per_share: 627.406246,
            fee: 0.15,
            tax_lot_id: "20260413-VOO-001",
          },
        ],
        v6_execution_log: [
          {
            trade_date: "2026-05-26",
            trade_time: "10:37",
            ticker: "RSP",
            action: "Sell",
            quantity: 0.44151,
            execution_price: 207.47,
            clearing_fee: 0.15,
            regulatory_fees: 0.02,
          },
        ],
      },
      { file: "inversiones.json", apply: false },
    );

    expect(payload).toMatchObject({
      source: "hapi-json",
      dryRun: true,
      cashAdjustments: [
        { externalId: "deposit:2026-04-01", type: "DEPOSIT" },
        { externalId: "dividend:2026-05-15:AAPL", type: "DIVIDEND" },
      ],
      trades: [
        { externalId: "20260413-VOO-001", symbol: "VOO", side: "BUY" },
        {
          externalId: "sell:2026-05-26:10:37:RSP",
          symbol: "RSP",
          side: "SELL",
        },
      ],
    });
  });

  it("uses explicit instrument IDs from import maps", () => {
    const payload = buildHapiImportPayload(
      {
        income_taxes: [
          {
            event_date: "2026-05-15",
            ticker: "AAPL",
            net_amount: 0.03,
          },
        ],
        transactions: [
          {
            trade_date: "2026-04-13",
            ticker: "VOO",
            quantity: 0.07013,
            price_per_share: 627.406246,
            tax_lot_id: "20260413-VOO-001",
          },
        ],
      },
      {
        file: "inversiones.json",
        instrumentMap: ["AAPL=inst-aapl", "VOO=inst-voo"],
      },
    );

    expect(payload).toMatchObject({
      cashAdjustments: [
        { externalId: "dividend:2026-05-15:AAPL", instrumentId: "inst-aapl" },
      ],
      trades: [{ externalId: "20260413-VOO-001", instrumentId: "inst-voo" }],
    });
  });

  it("reconciles sell quantities from closed tax lots when available", () => {
    const payload = buildHapiImportPayload(
      {
        tax_lots: [
          {
            sale_date: "2026-05-26",
            ticker: "SCCO",
            qty_sold: 0.09701,
          },
          {
            sale_date: "2026-05-26",
            ticker: "SCCO",
            qty_sold: 0.11107,
          },
        ],
        v6_execution_log: [
          {
            trade_date: "2026-05-26",
            ticker: "SCCO",
            action: "Sell",
            quantity: 0.21016,
            execution_price: 185.86,
            gross_amount: 39.06,
          },
        ],
      },
      { file: "inversiones.json" },
    );

    expect(payload).toMatchObject({
      trades: [
        {
          externalId: "sell:2026-05-26:00:00:SCCO",
          symbol: "SCCO",
          side: "SELL",
          quantity: 0.20808,
          price: 39.06 / 0.20808,
        },
      ],
    });
  });
});
