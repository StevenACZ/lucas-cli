import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { getApiUrl, loadCredentials } from "../../lib/config.js";
import { output } from "../../lib/output.js";

export const statusCommand = new Command("status")
  .description("Show authentication status")
  .option(
    "--remote",
    "Also verify the token against the API (GET /api/auth/me)",
  )
  .action(async (opts: { remote?: boolean }) => {
    const creds = loadCredentials();
    if (!creds) {
      output.error("Not authenticated. Run: lucas auth login");
    }

    const expired =
      Boolean(creds.expiresAt) && new Date(creds.expiresAt) <= new Date();

    const status = {
      authenticated: !expired,
      expired,
      apiUrl: getApiUrl(creds),
      deviceName: creds.deviceName,
      scope: creds.scope ?? null,
      expiresAt: creds.expiresAt,
    };

    if (!opts.remote) {
      output.success(status);
      return;
    }

    const me = await apiRequest<unknown>("GET", "/api/auth/me");
    output.success({ ...status, remote: me });
  });
