import type { Options } from "fast-glob";
import fg from "fast-glob";
import findUp from "find-up";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
import stripJsonComments from "strip-json-comments";
import { WORKSPACE_ROOT_SENTINELS } from ".";

const isTesting = Boolean(process.env.NODE_TEST_CONTEXT);

function dirnameAll(paths: string[]): string[] {
  return paths.map((p) => path.dirname(p));
}

function makeFindSentinel<R>(finder: (name: string[]) => R) {
  let result: R | undefined;
  return () => {
    if (isTesting || !result) {
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

export async function readJSON(path: string) {
  const json = await readFile(path, { encoding: "utf-8" });
  return JSON.parse(stripJsonComments(json));
}

export function readJSONSync(path: string) {
  const json = readFileSync(path, { encoding: "utf-8" });
  return JSON.parse(stripJsonComments(json));
}
