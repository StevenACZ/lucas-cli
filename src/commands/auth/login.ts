import { Command } from "commander";
import { hostname } from "os";
import { execFile } from "child_process";
import { getApiUrl, saveCredentials } from "../../lib/config.js";

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  execFile(cmd, [url], () => {});
}

function write(text: string): void {
  process.stderr.write(text);
}

function writeln(text: string): void {
  process.stderr.write(text + "\n");
}

async function pollForApproval(
  apiUrl: string,
  deviceCode: string,
  deviceName: string,
  pollIntervalMs = 3000,
): Promise<void> {
  const maxAttempts = 180;
  write("\n  Waiting for authorization ");

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    write(".");

    try {
      const res = await fetch(
        `${apiUrl}/api/cli/poll/${encodeURIComponent(deviceCode)}`,
      );
      if (!res.ok) continue;

      const data = (await res.json()) as {
        status: string;
        token?: string;
        expiresAt?: string;
      };

      if (data.status === "approved" && data.token) {
        saveCredentials({
          token: data.token,
          apiUrl,
          deviceName,
          expiresAt: data.expiresAt ?? "",
        });
        writeln("\n");
        writeln("  \x1b[32m✓\x1b[0m Authenticated successfully!");
        writeln(`  \x1b[2mDevice: ${deviceName}\x1b[0m`);
        writeln(
          `  \x1b[2mExpires: ${new Date(data.expiresAt ?? "").toLocaleDateString()}\x1b[0m`,
        );
        writeln("");
        return;
      }

      if (data.status === "expired") {
        writeln("\n");
        writeln("  \x1b[31m✗\x1b[0m Device code expired. Run again:");
        writeln("    lucas auth login");
        writeln("");
        process.exit(1);
      }
    } catch {
      // Network error, keep polling
    }
  }

  writeln("\n");
  writeln("  \x1b[31m✗\x1b[0m Polling timed out. Run again:");
  writeln("    lucas auth login");
  writeln("");
  process.exit(1);
}

interface RunLoginOptions {
  apiUrl?: string;
  deviceName?: string;
  pollIntervalMs?: number;
}

export async function runLogin(opts: RunLoginOptions = {}): Promise<void> {
  const apiUrl = opts.apiUrl ?? getApiUrl();
  const deviceName = opts.deviceName ?? `${hostname()} - CLI`;

  const res = await fetch(`${apiUrl}/api/cli/device-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName }),
  });

  if (!res.ok) {
    writeln("  \x1b[31m✗\x1b[0m Failed to connect to LucasApp API");
    process.exit(1);
  }

  const { deviceCode, userCode, verifyUrl } = (await res.json()) as {
    deviceCode: string;
    userCode?: string;
    verifyUrl: string;
  };
  const displayCode = userCode ?? deviceCode;

  writeln("");
  writeln("  \x1b[1mLucasApp CLI\x1b[0m — Device Authorization");
  writeln("");
  writeln(`  Your code: \x1b[1;36m${displayCode}\x1b[0m`);
  writeln("");
  writeln("  \x1b[2mOpening browser...\x1b[0m");
  writeln(
    `  \x1b[2mIf it didn't open, visit:\x1b[0m \x1b[4m${verifyUrl}\x1b[0m`,
  );

  openBrowser(verifyUrl);
  await pollForApproval(apiUrl, deviceCode, deviceName, opts.pollIntervalMs);
}

export const loginCommand = new Command("login")
  .description("Authenticate with LucasApp")
  .option("--api-url <url>", "API base URL")
  .option("--device-name <name>", "Device name", `${hostname()} - CLI`)
  .action(async (opts) => {
    await runLogin({
      apiUrl: opts.apiUrl,
      deviceName: opts.deviceName,
    });
  });
