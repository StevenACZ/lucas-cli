import { describe, expect, it } from "vitest";
import { enrichSubscriptionsWithCharges } from "../../src/lib/subscription-enrichment.js";

describe("enrichSubscriptionsWithCharges", () => {
  it("explains subscriptions that have pending charges but no lastBilling", () => {
    const [subscription] = enrichSubscriptionsWithCharges(
      [
        {
          id: "sub_1",
          isActive: true,
          lastBilling: null,
          nextBilling: "2026-04-01",
        },
      ],
      [
        {
          subscriptionId: "sub_1",
          dueDate: "2026-04-01T12:00:00.000Z",
          paidAt: null,
          status: "PENDING",
        },
      ],
      new Date("2026-04-02T10:00:00.000Z"),
    );

    expect(subscription.computedStatus).toBe("DUE");
    expect(subscription.latestChargeStatus).toBe("PENDING");
    expect(subscription.lastChargeDate).toBeNull();
    expect(subscription.lastBillingExplanation).toBe(
      "charge_exists_but_has_not_been_paid",
    );
  });

  it("uses the newest charge to expose lastChargeDate and latestChargeStatus", () => {
    const [subscription] = enrichSubscriptionsWithCharges(
      [
        {
          id: "sub_2",
          isActive: true,
          lastBilling: "2026-02-01T12:00:00.000Z",
        },
      ],
      [
        {
          subscriptionId: "sub_2",
          dueDate: "2026-03-01T12:00:00.000Z",
          paidAt: "2026-03-01T13:00:00.000Z",
          status: "PAID",
        },
        {
          subscriptionId: "sub_2",
          dueDate: "2026-02-01T12:00:00.000Z",
          paidAt: "2026-02-01T13:00:00.000Z",
          status: "PAID",
        },
      ],
      new Date("2026-04-02T10:00:00.000Z"),
    );

    expect(subscription.computedStatus).toBe("PAID_UP_TO_DATE");
    expect(subscription.latestChargeStatus).toBe("PAID");
    expect(subscription.lastChargeDate).toBe("2026-03-01T13:00:00.000Z");
    expect(subscription.lastBillingExplanation).toBe("latest_charge_paid");
  });
});
