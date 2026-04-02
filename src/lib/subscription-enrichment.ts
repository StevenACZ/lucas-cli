export interface SubscriptionLike {
  id: string;
  lastBilling?: string | null;
  nextBilling?: string | null;
  isActive?: boolean;
}

export interface SubscriptionChargeLike {
  subscriptionId: string;
  dueDate: string;
  paidAt?: string | null;
  status: string;
}

function getComputedStatus(
  subscription: SubscriptionLike,
  charge: SubscriptionChargeLike | undefined,
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
  subscription: SubscriptionLike,
  charge: SubscriptionChargeLike | undefined,
) {
  if (charge?.paidAt) return "latest_charge_paid";
  if (subscription.lastBilling) return "subscription_last_billing";
  if (charge) return "charge_exists_but_has_not_been_paid";
  return "no_charge_history";
}

export function enrichSubscriptionsWithCharges<
  TSubscription extends SubscriptionLike,
  TCharge extends SubscriptionChargeLike,
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
