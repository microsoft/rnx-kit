import fs from "node:fs";
import path from "node:path";
import {
  findDependencyChanges,
  rebaseExternalDeps,
  reportDependencyChanges,
  sortStringRecord,
} from "./dependencies";
import { getDepsFromJson, loadExternalDeps, parseJsonPath } from "./finder";
import type {
  DefinitionFinder,
  ExternalDeps,
  ExternalWorkspaces,
  ExternalWorkspacesConfig,
  TraceFunc,
} from "./types";

const nullFunction = () => null;
export const externalWorkspacesKey = "external-workspaces";

class ExternalWorkspacesImpl implements ExternalWorkspaces {
  outputOnlyOnCommand: boolean;
  outputPath: string;
  findPackage: DefinitionFinder;
  trace: TraceFunc;
  report: TraceFunc;
  root: string;

  private startTime = performance.now();
  private static pkgJsonKey = "external-workspaces";
  private logTo: string;

  constructor(root: string) {
    this.root = root;
    const { outputOnlyOnCommand, outputPath, externalDependencies, logTo } =
      this.loadConfig(this.root);

    this.outputOnlyOnCommand = Boolean(outputOnlyOnCommand);
    this.outputPath = outputPath || "";
    this.logTo = logTo || "";

    // trace and report are closures so they capture the context if detached
    this.trace = this.createTraceFunction();
    this.report = (msg: string) => {
      console.log(msg);
      this.trace(msg);
    };

    // load the find package method
    this.findPackage = loadExternalDeps(externalDependencies, root, this.trace);
  }

  outputWorkspaces(
    workspaces: ExternalDeps,
    outputPath?: string,
    checkOnly?: boolean
  ) {
    outputPath ??= this.outputPath;
    if (!outputPath) {
      this.trace("No output path specified, skipping write");
      return;
    }
    // separate any attached keys path from the json file path
    const { jsonPath, keysPath } = parseJsonPath(
      path.join(this.root, outputPath)
    );
    if (jsonPath) {
      // get the jsonDir and ensure the directory exists
      const jsonDir = path.dirname(jsonPath);
      if (!checkOnly) {
        this.ensureDirExists(jsonDir);
      }

      // create a relative path to rebase from relative to the root, and update the new workspaces
      const deltaPath = path.relative(path.dirname(jsonDir), this.root);
      const newWorkspaces = rebaseExternalDeps(workspaces, deltaPath);

      // load previous workspaces if they exist
      const parsedJson = fs.existsSync(jsonPath)
        ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
        : {};
      const oldWorkspaces = getDepsFromJson(parsedJson, keysPath) || {};
      const changes = findDependencyChanges(oldWorkspaces, newWorkspaces);
      if (changes) {
        if (checkOnly) {
          this.report(`Update needed for ${outputPath}:`);
          reportDependencyChanges(changes, this.report);
        } else {
          this.report(`Updating ${outputPath}...`);

          const keys = keysPath ? keysPath.split("/") : [];
          const newJson = keys.length > 0 ? parsedJson : {};
          let current = newJson;

          let key = keys.shift();
          while (key) {
            // build up the path, replacing the last node to write it fully
            if (!current[key] || keys.length === 0) {
              current[key] = {};
            }
            current = current[key];
            key = keys.shift();
          }

          // write out the new workspaces into current in sorted order
          sortStringRecord(newWorkspaces, current);
          const jsonOutput = JSON.stringify(newJson, null, 2);
          fs.writeFileSync(jsonPath, jsonOutput);
          this.report(`Updated ${jsonPath}`);
        }
      }
    }
  }

  private loadConfig(root: string) {
    const rootManifest = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    );
    const config = (rootManifest[ExternalWorkspacesImpl.pkgJsonKey] ||
      {}) as ExternalWorkspacesConfig;
    return config;
  }

  private createTraceFunction(): TraceFunc {
    if (!this.logTo) {
      return nullFunction;
    }
    if (this.logTo === "console") {
      return (msg: string) => this.consoleTrace(msg);
    } else {
      // ensure the log file directory exists
      const dir = path.dirname(this.logTo);
      this.ensureDirExists(dir);

      // write out a session start message, we don't erase the log
      this.fileTrace(
        `\n==== Session Started at ${new Date().toISOString()} ====`
      );
      return (msg: string) => this.fileTrace(msg);
    }
  }

  private formatTrace(msg: string) {
    return `[${(performance.now() - this.startTime).toFixed(2)}ms] ${msg}`;
  }

  private consoleTrace(msg: string) {
    console.log(this.formatTrace(msg));
  }

  private fileTrace(msg: string) {
    fs.appendFile(this.logTo, this.formatTrace(msg) + "\n", nullFunction);
  }

  private ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
        mode: 0o755,
      });
    }
  }
}

let externalWorkspaces: ExternalWorkspaces | undefined;

/**
 * Load the settings for the current repo from the root package.json
 * @param rootPath path to the root of the repository
 * @param defaultToConsole if true, will log to the console if no logTo is specified
 */
export function getExternalWorkspaces(rootPath: string): ExternalWorkspaces {
  const root = path.resolve(rootPath);
  if (!externalWorkspaces || externalWorkspaces.root !== root) {
    externalWorkspaces = new ExternalWorkspacesImpl(root);
  }
  return externalWorkspaces;
}
