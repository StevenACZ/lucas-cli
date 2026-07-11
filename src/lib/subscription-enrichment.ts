import type { Subscription, SubscriptionCharge } from "./types.js";

function getComputedStatus(
  subscription: Subscription,
  charge: SubscriptionCharge | undefined,
  now: Date,
) {
  if (subscription.isActive === false) return "INACTIVE";
  if (charge?.status === "OVERDUE") return "OVERDUE";
  if (charge?.status === "PENDING") {
    return new Date(charge.dueDate) <= now ? "DUE" : "PENDING";
  }
  return "PAID_UP_TO_DATE";
}

function getLastBillingExplanation(
  subscription: Subscription,
  charge: SubscriptionCharge | undefined,
) {
  if (charge?.paidAt) return "latest_charge_paid";
  if (subscription.lastBilling) return "subscription_last_billing";
  if (charge) return "charge_exists_but_has_not_been_paid";
  return "no_charge_history";
}

export function enrichSubscriptionsWithCharges<
  TSubscription extends Subscription,
  TCharge extends SubscriptionCharge,
>(subscriptions: TSubscription[], charges: TCharge[], now: Date = new Date()) {
  const latestBySubscription = new Map<string, TCharge>();
  for (const charge of charges) {
    const current = latestBySubscription.get(charge.subscriptionId);
    if (!current || current.dueDate < charge.dueDate) {
      latestBySubscription.set(charge.subscriptionId, charge);
    }
  }
  return subscriptions.map((subscription) => {
    const latestCharge = latestBySubscription.get(subscription.id);
    return {
      ...subscription,
      computedStatus: getComputedStatus(subscription, latestCharge, now),
      latestChargeStatus: latestCharge?.status ?? null,
      lastChargeDate: latestCharge?.paidAt ?? subscription.lastBilling ?? null,
      lastChargeDueDate: latestCharge?.dueDate ?? null,
      lastBillingKnown:
        subscription.lastBilling !== null &&
        subscription.lastBilling !== undefined,
      lastBillingExplanation: getLastBillingExplanation(
        subscription,
        latestCharge,
      ),
    };
  });
}
