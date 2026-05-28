import { describe, expect, it } from "vitest";
import {
  buildSubscriptionListParams,
  getSubscriptionItems,
} from "../../src/commands/subscriptions/list.js";
import { buildSubscriptionCalendarParams } from "../../src/commands/subscriptions/calendar.js";

describe("subscriptions list", () => {
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
