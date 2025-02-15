import fs from "node:fs";
import path from "node:path";

// path to the log file if logging is enabled
const LOG_PATH = path.join(process.cwd(), "plugin-external-workspaces.log");
// time when the plugin started, used for log reporting
const START_TIME = performance.now();

const consoleMode = "console";
let traceTo: string | undefined = undefined;

export function enableLogging(traceSetting?: string) {
  traceTo = traceSetting ?? LOG_PATH;
  if (traceTo !== consoleMode) {
    fs.writeFileSync(traceTo, "");
  }
}

/**
 * @param msg write the message to the log file if tracing is enabled
 */
export function trace(msg: string) {
  if (traceTo) {
    const delta = (performance.now() - START_TIME).toFixed(2);
    if (traceTo === consoleMode) {
      console.log(`[${delta}ms] ${msg}`);
    } else {
      fs.appendFile(LOG_PATH, `[${delta}ms] ${msg}\n`, () => null);
    }
  }
}
