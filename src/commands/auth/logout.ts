import { Command } from "commander";
import { clearCredentials } from "../../lib/config.js";
import { output } from "../../lib/output.js";

export const logoutCommand = new Command("logout")
  .description("Remove stored credentials")
  .action(() => {
    clearCredentials();
    output.success({ message: "Logged out successfully" });
  });
