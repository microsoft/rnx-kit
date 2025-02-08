import fs from "node:fs";
import path from "node:path";

// path to the log file if logging is enabled
const LOG_PATH = path.join(process.cwd(), "plugin-external-workspaces.log");
// time when the plugin started, used for log reporting
const START_TIME = performance.now();

let tracingEnabled = false;
const logs: string[] = [];

export function enableLogging() {
  tracingEnabled = true;
  fs.writeFileSync(LOG_PATH, "");
}

/**
 * @param msg write the message to the log file if tracing is enabled
 */
export function trace(msg: string, writeNow?: boolean) {
  if (tracingEnabled) {
    const delta = (performance.now() - START_TIME).toFixed(2);
    logs.push(`[${delta}ms] ${msg}`);
    if (writeNow) {
      writeLogs();
    }
  }
}

export function writeLogs() {
  if (logs.length > 0) {
    const logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });
    logStream.write(logs.join("\n") + "\n");
    logStream.close();
    logs.length = 0;
  }
}
