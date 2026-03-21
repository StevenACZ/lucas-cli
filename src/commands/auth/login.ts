import { Command } from "commander";
import { hostname } from "os";
import { exec } from "child_process";
import { getApiUrl, saveCredentials } from "../../lib/config.js";
import { output } from "../../lib/output.js";

// Abre URL en el navegador del sistema
function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} ${url}`);
}

async function pollForApproval(
  apiUrl: string,
  code: string,
  deviceName: string,
): Promise<void> {
  const maxAttempts = 180;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${apiUrl}/api/cli/poll/${code}`);

    if (!res.ok) continue;
    const data = (await res.json()) as {
      status: string;
      token?: string;
      expiresAt?: string;
    };

    if (data.status === "APPROVED" && data.token) {
      saveCredentials({
        token: data.token,
        apiUrl,
        deviceName,
        expiresAt: data.expiresAt ?? "",
      });
      output.success({ message: "Authenticated successfully" });
      return;
    }
    if (data.status === "EXPIRED") {
      output.error("Device code expired. Please try again.");
    }
  }
  output.error("Polling timed out. Please try again.");
}

export const loginCommand = new Command("login")
  .description("Authenticate with LucasApp")
  .option("--api-url <url>", "API base URL")
  .option("--device-name <name>", "Device name", `${hostname()} - CLI`)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? getApiUrl();
    const deviceName = opts.deviceName as string;

    const res = await fetch(`${apiUrl}/api/cli/device-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName }),
    });

    if (!res.ok) {
      output.error("Failed to initiate device auth", res.status);
    }

    const { deviceCode, verifyUrl } = (await res.json()) as {
      deviceCode: string;
      verifyUrl: string;
    };

    output.success({
      message: "Open this URL to authorize",
      deviceCode,
      verifyUrl,
    });

    openBrowser(verifyUrl);
    await pollForApproval(apiUrl, deviceCode, deviceName);
  });
