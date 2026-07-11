import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const subscriptionServicesCommand = new Command("services")
  .description("List the backend-owned subscription service catalog")
  .action(async () => {
    const data = await apiRequest("GET", "/api/subscriptions/services");
    output.success(data);
  });
