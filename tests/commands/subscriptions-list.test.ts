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

const {
  buildSubscriptionListParams,
  buildSubscriptionListPayload,
  getSubscriptionItems,
  listSubscriptionsCommand,
} = await import("../../src/commands/subscriptions/list.js");
const { buildSubscriptionCalendarParams } =
  await import("../../src/commands/subscriptions/calendar.js");

describe("subscriptions list", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("accepts legacy array responses", () => {
    const subscriptions = [{ id: "sub-1" }];

    expect(getSubscriptionItems(subscriptions)).toEqual(subscriptions);
  });

  it("extracts paginated subscription items from the backend response", () => {
    const subscriptions = [{ id: "sub-1" }];

    expect(
      getSubscriptionItems({
        items: subscriptions,
        summary: { total: 1 },
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
      }),
    ).toEqual(subscriptions);
  });

  it("returns the enriched items as data and pagination/summary as meta", () => {
    const pagination = { limit: 10, offset: 0, hasMore: true, total: 23 };
    const summary = { total: 23, monthlyTotal: 415.5 };

    const payload = buildSubscriptionListPayload(
      {
        items: [{ id: "sub-1", isActive: true, logoBase64: "x" }],
        summary,
        pagination,
      },
      [],
    );

    expect(payload?.meta).toEqual({ count: 1, ...pagination, summary });
    expect(payload?.data).toEqual([
      expect.objectContaining({ id: "sub-1", computedStatus: "UNKNOWN" }),
    ]);
    expect(payload?.data[0]).not.toHaveProperty("logoBase64");
  });

  it("accepts legacy bare array responses", () => {
    const payload = buildSubscriptionListPayload(
      [{ id: "sub-1", isActive: true }],
      [],
    );

    expect(Array.isArray(payload?.data)).toBe(true);
    expect(payload?.meta).toEqual({ count: 1 });
  });

  it("reports an unexpected response shape as null", () => {
    expect(buildSubscriptionListPayload({ nope: true }, [])).toBeNull();
  });

  it("emits data and meta from the list command itself", async () => {
    const pagination = { limit: 100, offset: 0, hasMore: false, total: 1 };
    apiRequest
      .mockResolvedValueOnce({
        items: [{ id: "sub-1", isActive: true }],
        summary: { total: 1 },
        pagination,
      })
      .mockResolvedValueOnce([]);

    await listSubscriptionsCommand.parseAsync(["--include-inactive"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/subscriptions",
      undefined,
      { limit: "100", offset: "0", includeInactive: "true" },
    );
    const [data, meta] = outputSuccess.mock.calls[0];
    expect(data).toHaveLength(1);
    expect(meta).toMatchObject({ count: 1, hasMore: false, total: 1 });
  });

  it("builds backend subscription list filters", () => {
    expect(
      buildSubscriptionListParams({
        limit: "20",
        offset: "10",
        frequency: "MONTHLY",
        type: "SERVICE",
        groupId: "group-1",
      }),
    ).toEqual({
      limit: "20",
      offset: "10",
      frequency: "MONTHLY",
      type: "SERVICE",
      groupId: "group-1",
    });
  });

  it("builds monthly calendar filters", () => {
    expect(
      buildSubscriptionCalendarParams({
        month: "2026-05",
        frequency: "MONTHLY",
        type: "SUBSCRIPTION",
        groupId: "group-1",
      }),
    ).toEqual({
      month: "2026-05",
      frequency: "MONTHLY",
      type: "SUBSCRIPTION",
      groupId: "group-1",
    });
  });
});
