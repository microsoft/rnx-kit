#!/usr/bin/env node

import chalk from "chalk";
import os from "os";
import { cli } from "./cli";

try {
  cli(process.argv);
  process.exit(0);
} catch (e) {
  const message =
    typeof e === "object" && e !== null
      ? e.toString()
      : "an internal error occurred";
  console.error(chalk.redBright("ERROR: ") + chalk.red(message) + os.EOL);
  process.exit(1);
}
