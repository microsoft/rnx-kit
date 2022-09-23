import type { Options } from "fast-glob";
import fs from "fs";
import fg from "fast-glob";
import findUp from "find-up";
import * as path from "path";

type PackageManager = {
  findWorkspacePackages: (sentinel: string) => Promise<string[]>;
  findWorkspacePackagesSync: (sentinel: string) => string[];
};

export const LERNA_JSON = "lerna.json";
export const PNPM_WORKSPACE_YAML = "pnpm-workspace.yaml";
export const RUSH_JSON = "rush.json";
export const PACKAGE_JSON = "package.json";

export const WORKSPACE_ROOT_SENTINELS = [
  LERNA_JSON,
  RUSH_JSON,
  PNPM_WORKSPACE_YAML,
  PACKAGE_JSON,
];

const PACKAGE_JSON_REGEX = new RegExp(PACKAGE_JSON + "$", "i");

function makeFindPackages<R>(
  glob: (patterns: string[], options: Options) => R,
  fallback: R
) {
  const ignore = ["**/Pods/**", "**/bower_components/**", "**/node_modules/**"];
  return (patterns: string[] | undefined, cwd: string): R => {
    if (!Array.isArray(patterns)) {
      return fallback;
    }

    return glob(patterns, {
      cwd,
      ignore,
      absolute: true,
      onlyDirectories: true,
    });
  };
}

export const findPackages = makeFindPackages(fg, Promise.resolve([]));
export const findPackagesSync = makeFindPackages(fg.sync, []);

export const findSentinelSync = (cwd = process.cwd()): string | undefined => {
  let result: string | undefined;
  if (process.env.JEST_WORKER_ID || !result) {
    result = findUp.sync(WORKSPACE_ROOT_SENTINELS, { cwd });
  }

  if (result?.match(PACKAGE_JSON_REGEX)) {
    if (!JSON.parse(fs.readFileSync(result).toString()).workspaces) {
      const nextCwd = cwd.split(path.sep).slice(0, -1).join(path.sep);
      result = findSentinelSync(nextCwd);
    }
  }

  return result;
};

export const findSentinel = async (
  cwd = process.cwd()
): Promise<string | undefined> => {
  let result: string | undefined;
  if (process.env.JEST_WORKER_ID || !result) {
    result = findUp.sync(WORKSPACE_ROOT_SENTINELS, { cwd });
  }

  if (result?.match(PACKAGE_JSON_REGEX)) {
    if (!JSON.parse(await asyncReadFile(result)).workspaces) {
      result = await findSentinel(
        cwd.split(path.sep).slice(0, -1).join(path.sep)
      );
    }
  }

  return result;
};

export function getImplementation(sentinel: string): Promise<PackageManager> {
  switch (path.basename(sentinel)) {
    case PACKAGE_JSON: // logic defining workspaces config is the same for npm and yarn
      return import("./yarn");

    case LERNA_JSON:
      return import("./lerna");

    case PNPM_WORKSPACE_YAML:
      return import("./pnpm");

    case RUSH_JSON:
      return import("./rush");
  }

  throw new Error(
    `This should not happen - did we forget to add a switch case for '${sentinel}'?`
  );
}

export function getImplementationSync(sentinel: string): PackageManager {
  switch (path.basename(sentinel)) {
    case PACKAGE_JSON: // Same logic for yarn and npm
      return require("./yarn");

    case LERNA_JSON:
      return require("./lerna");

    case PNPM_WORKSPACE_YAML:
      return require("./pnpm");

    case RUSH_JSON:
      return require("./rush");
  }

  throw new Error(
    `This should not happen - did we forget to add a switch case for '${sentinel}'?`
  );
}

function asyncReadFile(p: string): Promise<string> {
  return new Promise((res, rej) =>
    fs.readFile(p, (err, val) => {
      if (err) {
        rej(err);
      } else {
        res(val.toString());
      }
    })
  );
}
