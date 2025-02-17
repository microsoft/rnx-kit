import fs from "node:fs";
import path from "node:path";

// path to the log file if logging is enabled
const LOG_PATH = path.join(process.cwd(), "plugin-external-workspaces.log");
// time when the plugin started, used for log reporting
const START_TIME = performance.now();

let tracingEnabled = false;

export function enableLogging() {
  tracingEnabled = true;
  fs.writeFileSync(LOG_PATH, "");
}

/**
 * @param msg write the message to the log file if tracing is enabled
 */
export function trace(msg: string) {
  if (tracingEnabled) {
    const delta = (performance.now() - START_TIME).toFixed(2);
    const logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });
    logStream.write(`[${delta}ms] ${msg}\n`);
    logStream.close();
  }
}
