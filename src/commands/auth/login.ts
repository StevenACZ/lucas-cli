import { Command } from "commander";
import { hostname } from "os";
import {
  getApiUrl,
  saveCredentials,
  type DeviceScope,
} from "../../lib/config.js";
import { output } from "../../lib/output.js";

const POLL_INTERVAL_MS = 3000;

interface DeviceAuthStart {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
}

interface PollResponse {
  status: "pending" | "approved" | "expired" | "denied";
  token?: string;
  scope?: DeviceScope;
  expiresAt?: string;
  expiresIn?: number;
}

function writeln(text: string): void {
  process.stderr.write(text + "\n");
}

function write(text: string): void {
  process.stderr.write(text);
}

async function pollForApproval(
  apiUrl: string,
  deviceCode: string,
  deviceName: string,
  pollIntervalMs: number,
  expiresInSeconds: number,
): Promise<never | void> {
  const maxAttempts = Math.max(
    1,
    Math.ceil((expiresInSeconds * 1000) / pollIntervalMs),
  );
  write("\n  Waiting for approval ");

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    write(".");

    let data: PollResponse;
    try {
      const res = await fetch(
        `${apiUrl}/api/cli/poll/${encodeURIComponent(deviceCode)}`,
      );
      if (!res.ok) continue;
      data = (await res.json()) as PollResponse;
    } catch {
      // Network error, keep polling
      continue;
    }

    if (data.status === "approved" && data.token) {
      const expiresAt = data.expiresAt ?? "";
      const scope = data.scope ?? "READ_ONLY";
      saveCredentials({
        token: data.token,
        apiUrl,
        deviceName,
        expiresAt,
        scope,
      });
      writeln("\n");
      writeln("  \x1b[32m✓\x1b[0m Authenticated successfully!");
      writeln(`  \x1b[2mDevice: ${deviceName}\x1b[0m`);
      writeln(`  \x1b[2mAccess: ${scope}\x1b[0m`);
      writeln(
        `  \x1b[2mExpires: ${new Date(expiresAt).toLocaleDateString()}\x1b[0m`,
      );
      writeln("");
      output.success({ deviceName, scope, expiresAt });
      return;
    }

    if (data.status === "denied") {
      writeln("\n");
      output.error(
        "Access request was denied from the app. Run `lucas auth login` to request a new code.",
        403,
        { code: "DEVICE_DENIED" },
      );
    }

    if (data.status === "expired") {
      writeln("\n");
      output.error(
        "Device code expired before it was approved. Run `lucas auth login` to get a new code.",
        410,
        { code: "DEVICE_CODE_EXPIRED" },
      );
    }
  }

  writeln("\n");
  output.error(
    "Device code expired before it was approved. Run `lucas auth login` to get a new code.",
    410,
    { code: "DEVICE_CODE_EXPIRED" },
  );
}

interface RunLoginOptions {
  apiUrl?: string;
  deviceName?: string;
  pollIntervalMs?: number;
}

export async function runLogin(opts: RunLoginOptions = {}): Promise<void> {
  const apiUrl = opts.apiUrl ?? getApiUrl();
  const deviceName = opts.deviceName ?? `${hostname()} - CLI`;

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/cli/device-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName }),
    });
  } catch {
    output.error(
      `Cannot reach LucasApp API at ${apiUrl}. Check your connection or use --api-url https://api.lucasapp.app`,
      503,
      { code: "NETWORK_ERROR", apiUrl },
    );
  }

  if (!res.ok) {
    output.error(
      `Cannot reach LucasApp API at ${apiUrl}. Check your connection or use --api-url https://api.lucasapp.app`,
      res.status,
      { code: "DEVICE_AUTH_FAILED", statusCode: res.status },
    );
  }

  const { deviceCode, userCode, expiresIn } =
    (await res.json()) as DeviceAuthStart;

  const codeLine = `  ${userCode}  `;
  const border = "─".repeat(codeLine.length);
  writeln("");
  writeln("  \x1b[1mLucasApp CLI\x1b[0m — Link this device");
  writeln("");
  writeln(`  ┌${border}┐`);
  writeln(`  │${" ".repeat(codeLine.length)}│`);
  writeln(`  │  \x1b[1;36m${userCode}\x1b[0m  │`);
  writeln(`  │${" ".repeat(codeLine.length)}│`);
  writeln(`  └${border}┘`);
  writeln("");
  writeln(
    "  Open LucasApp on your iPhone → Settings → Security → CLI Access →",
  );
  writeln("  enter this code.");
  writeln("");
  writeln(
    "  \x1b[2mYou choose the access level (read-only or full) in the app.\x1b[0m",
  );

  await pollForApproval(
    apiUrl,
    deviceCode,
    deviceName,
    opts.pollIntervalMs ?? POLL_INTERVAL_MS,
    expiresIn ?? 900,
  );
}

export const loginCommand = new Command("login")
  .description("Link this device to your LucasApp account (approved in-app)")
  .option("--api-url <url>", "API base URL")
  .option("--device-name <name>", "Device name", `${hostname()} - CLI`)
  .action(async (opts) => {
    await runLogin({
      apiUrl: opts.apiUrl,
      deviceName: opts.deviceName,
    });
  });
