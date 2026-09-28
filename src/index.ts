#!/usr/bin/env node
import { buildProgram } from "./cli.js";
import { runProgram } from "./lib/program.js";
import { maybeNotifyForUpdate } from "./lib/update-notifier.js";
import { CLI_VERSION } from "./lib/version.js";

await runProgram(await buildProgram());
await maybeNotifyForUpdate(CLI_VERSION);
