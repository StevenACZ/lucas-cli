import { Command } from "commander";
import {
  clearCredentials,
  getApiUrl,
  loadCredentials,
} from "../../lib/config.js";
import { CliError } from "../../lib/errors.js";
import { output } from "../../lib/output.js";

export async function runLogout(opts: { force?: boolean } = {}): Promise<void> {
  const creds = loadCredentials();
  if (!creds?.token) {
    clearCredentials();
    output.success({ message: "Logged out successfully", revoked: false });
    return;
  }

  const expired =
    Boolean(creds.expiresAt) && new Date(creds.expiresAt) <= new Date();
  let apiUrl: string | null = null;
  let status: number | null = null;

  if (!expired) {
    try {
      apiUrl = getApiUrl(creds);
    } catch (error) {
      if (!opts.force) throw error;
    }
  }

  if (apiUrl) {
    const response = await fetch(`${apiUrl}/api/cli/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    status = response?.status ?? null;
  }

  const revoked = status !== null && status >= 200 && status < 300;
  const alreadyInvalid = expired || status === 401;
  if (!revoked && !alreadyInvalid && !opts.force) {
    throw new CliError({
      code: "REVOKE_FAILED",
      message:
        "Could not revoke this device on the server, so the credentials were kept.",
      hint: "Run `lucas auth logout` again when the API is reachable, or revoke the device in the LucasApp app (Settings → Security → CLI Access) and run `lucas auth logout --force`.",
      details: { apiUrl, status },
    });
  }

  clearCredentials();
  output.success({ message: "Logged out successfully", revoked });
}

export const logoutCommand = new Command("logout")
  .description("Revoke this device and remove stored credentials")
  .option(
    "--force",
    "Remove local credentials even if the server revocation fails",
  )
  .action(async (opts: { force?: boolean }) => {
    await runLogout({ force: opts.force });
  });
