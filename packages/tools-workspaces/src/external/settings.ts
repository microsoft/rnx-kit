import fs from "node:fs";
import path from "node:path";
import { loadExternalDeps } from "./finder";
import type {
  ExternalWorkspacesConfig,
  ExternalWorkspacesSettings,
  TraceFunc,
} from "./types";

export const externalWorkspacesKey = "external-workspaces";

const nullFunction = () => null;

function writeToFile(msg: string, logPath: string) {
  fs.appendFile(logPath, msg, nullFunction);
}

/**
 * @param logTo either 'console' or a path to a file to log to, or undefined for no logging
 * @returns a function that will trace output, or a null function that will do nothing
 */
function createTraceFunction(logTo: string | undefined): TraceFunc {
  if (typeof logTo === "string") {
    const startTime = performance.now();
    if (logTo === "console") {
      return (msg: string, logOnly?: boolean) => {
        if (!logOnly) {
          console.log(msg);
        }
      };
    } else {
      // ensure any directory exists
      const dir = path.dirname(logTo);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
      // write out a session start message
      writeToFile(
        `\n==== Session Started at ${new Date().toISOString()} ====\n`,
        logTo
      );
      // now return the file tracer which captures the start time and log path
      return (msg: string) => {
        writeToFile(
          `[${(performance.now() - startTime).toFixed(2)}ms] ${msg}\n`,
          logTo
        );
      };
    }
  }
  return nullFunction;
}

export function settingsFromConfig(
  rootPath: string,
  config: ExternalWorkspacesConfig
): ExternalWorkspacesSettings {
  const { logTo, externalDependencies, ...outputOptions } = config;
  const trace = createTraceFunction(config.logTo);
  const finder = loadExternalDeps(externalDependencies, rootPath, trace);
  return { finder, trace, ...outputOptions };
}

/**
 * Load the settings for the current repo from the root package.json
 * @param rootPath path to the root of the repository
 * @param defaultToConsole if true, will log to the console if no logTo is specified
 */
export function getExternalWorkspacesSettings(
  rootPath: string,
  defaultToConsole?: boolean
): ExternalWorkspacesSettings {
  const rootManifest = JSON.parse(
    fs.readFileSync(path.join(rootPath, "package.json"), "utf8")
  );
  const config = (rootManifest[externalWorkspacesKey] ||
    {}) as ExternalWorkspacesConfig;

  if (defaultToConsole && !config.logTo) {
    config.logTo = "console";
  }
  return settingsFromConfig(rootPath, config);
}
