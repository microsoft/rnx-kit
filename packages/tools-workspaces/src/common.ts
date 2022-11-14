import type { Options } from "fast-glob";
import fg from "fast-glob";
import findUp from "find-up";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
import stripJsonComments from "strip-json-comments";

type PackageManager = {
  findWorkspacePackages: (sentinel: string) => Promise<string[]>;
  findWorkspacePackagesSync: (sentinel: string) => string[];
};

export const LERNA_JSON = "lerna.json";
export const PACKAGE_LOCK_JSON = "package-lock.json";
export const PNPM_WORKSPACE_YAML = "pnpm-workspace.yaml";
export const RUSH_JSON = "rush.json";
export const YARN_LOCK = "yarn.lock";

export const WORKSPACE_ROOT_SENTINELS = [
  LERNA_JSON,
  RUSH_JSON,
  YARN_LOCK,
  PACKAGE_LOCK_JSON,
  PNPM_WORKSPACE_YAML,
];

function dirnameAll(paths: string[]): string[] {
  return paths.map((p) => path.dirname(p));
}

function makeFindSentinel<R>(finder: (name: string[]) => R) {
  let result: R | undefined;
  return () => {
    if (process.env.JEST_WORKER_ID || !result) {
      result = finder(WORKSPACE_ROOT_SENTINELS);
    }
    return result;
  };
}

function makeFindPackages<R>(
  glob: (patterns: string[], options: Options) => R,
  fallback: R,
  postprocess: (result: R) => R
) {
  const ignore = ["**/Pods/**", "**/bower_components/**", "**/node_modules/**"];
  return (patterns: string[] | undefined, cwd: string): R => {
    if (!Array.isArray(patterns)) {
      return fallback;
    }

    const pkgPatterns = patterns.map((p) => p + "/package.json");
    const result = glob(pkgPatterns, {
      cwd,
      ignore,
      absolute: true,
      onlyFiles: true,
    });
    return postprocess(result);
  };
}

export const findPackages = makeFindPackages(
  fg,
  Promise.resolve([]),
  (result: Promise<string[]>) => result.then(dirnameAll)
);

export const findPackagesSync = makeFindPackages(fg.sync, [], dirnameAll);

export const findSentinel = makeFindSentinel(findUp);
export const findSentinelSync = makeFindSentinel(findUp.sync);

export function getImplementation(sentinel: string): Promise<PackageManager> {
  switch (path.basename(sentinel)) {
    case PACKAGE_LOCK_JSON: // fallthrough - logic defining workspaces config is the same for npm and yarn
    case YARN_LOCK:
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
    case PACKAGE_LOCK_JSON: // fallthrough
    case YARN_LOCK:
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

export async function readJSON(path: string) {
  const json = await readFile(path, { encoding: "utf-8" });
  return JSON.parse(stripJsonComments(json));
}

export function readJSONSync(path: string) {
  const json = readFileSync(path, { encoding: "utf-8" });
  return JSON.parse(stripJsonComments(json));
}
