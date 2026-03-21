import { Command } from "commander";
import { loadCredentials } from "../../lib/config.js";
import { output } from "../../lib/output.js";

export const statusCommand = new Command("status")
  .description("Show authentication status")
  .action(() => {
    const creds = loadCredentials();
    if (!creds) {
      output.error("Not authenticated. Run: lucas auth login");
    }
    output.success({
      authenticated: true,
      apiUrl: creds!.apiUrl,
      deviceName: creds!.deviceName,
      expiresAt: creds!.expiresAt,
    });
  });
