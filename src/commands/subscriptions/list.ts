import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import {
  enrichSubscriptionsWithCharges,
  type SubscriptionChargeLike,
  type SubscriptionLike,
} from "../../lib/subscription-enrichment.js";

export const listSubscriptionsCommand = new Command("list")
  .description("List subscriptions with derived billing context for AI agents")
  .action(async () => {
    const [subscriptions, charges] = await Promise.all([
      apiRequest<SubscriptionLike[]>("GET", "/api/subscriptions"),
      apiRequest<SubscriptionChargeLike[]>("GET", "/api/subscription-charges"),
    ]);
    output.success(enrichSubscriptionsWithCharges(subscriptions, charges));
  });
