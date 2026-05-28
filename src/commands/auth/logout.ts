import { Command } from "commander";
import {
  clearCredentials,
  getApiUrl,
  loadCredentials,
} from "../../lib/config.js";
import { output } from "../../lib/output.js";

export async function runLogout(): Promise<void> {
  const creds = loadCredentials();
  let revoked = false;

  if (creds?.token) {
    const apiUrl = getApiUrl(creds);
    const response = await fetch(`${apiUrl}/api/cli/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
    }).catch(() => null);
    revoked = response?.ok ?? false;
  }

  clearCredentials();
  output.success({ message: "Logged out successfully", revoked });
}

export const logoutCommand = new Command("logout")
  .description("Remove stored credentials")
  .action(async () => {
    await runLogout();
  });
