import { ensureDirSync } from "@rnx-kit/tools-filesystem";
import { findUp } from "@rnx-kit/tools-node/path";
import * as crypto from "node:crypto";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { REACT_NATIVE_CONFIG_FILES } from "./context.ts";

export const CONFIG_CACHE_KEY = "config";
const HASH_ALGO = "sha256";
const UTF8 = { encoding: "utf-8" as const };

function makeCachePath(projectRoot: string, filename: string): string {
  return path.join(projectRoot, "node_modules", ".cache", "rnx-kit", filename);
}

function cacheStatePath(projectRoot: string, key: string): string {
  return makeCachePath(projectRoot, `${key}.${HASH_ALGO}`);
}

function configCachePath(projectRoot: string, key: string): string {
  return makeCachePath(projectRoot, `${key}.json`);
}

function updateHash(
  hash: crypto.Hash,
  files: string[],
  projectRoot: string,
  mode: "all" | "first-only",
  /** @internal */ fs = nodefs
) {
  const options = { startDir: projectRoot };
  for (const file of files) {
    const p = findUp(file, options);
    if (p) {
      hash.update(fs.readFileSync(p));
      if (mode === "first-only") {
        break;
      }
    }
  }
}

export function getCurrentState(projectRoot: string): string {
  const sha2 = crypto.createHash(HASH_ALGO);

  const configFiles = ["package.json", ...REACT_NATIVE_CONFIG_FILES];
  updateHash(sha2, configFiles, projectRoot, "all");

  const lockfiles = [
    "yarn.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bun.lock",
    "bun.lockb",
  ];
  updateHash(sha2, lockfiles, projectRoot, "first-only");

  return sha2.digest("hex");
}

export function getSavedState(
  projectRoot: string,
  key = CONFIG_CACHE_KEY,
  /** @internal */ fs = nodefs
): string | false {
  const stateFile = cacheStatePath(projectRoot, key);
  return fs.existsSync(stateFile) && fs.readFileSync(stateFile, UTF8);
}

export function invalidateState(
  projectRoot = process.cwd(),
  key = CONFIG_CACHE_KEY,
  /** @internal */ fs = nodefs
) {
  fs.rmSync(configCachePath(projectRoot, key));
  fs.rmSync(cacheStatePath(projectRoot, key));
}

export function loadConfigFromCache<T>(
  projectRoot: string,
  key = CONFIG_CACHE_KEY,
  /** @internal */ fs = nodefs
): T | null {
  const cacheFile = configCachePath(projectRoot, key);
  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  const config = fs.readFileSync(cacheFile, UTF8);
  return JSON.parse(config);
}

export function saveConfigToCache<T>(
  projectRoot: string,
  state: string,
  config: T,
  key = CONFIG_CACHE_KEY,
  /** @internal */ fs = nodefs
): void {
  const data = JSON.stringify(config);

  const configPath = configCachePath(projectRoot, key);
  ensureDirSync(path.dirname(configPath), fs);

  fs.writeFileSync(configPath, data, UTF8);
  fs.writeFileSync(cacheStatePath(projectRoot, key), state, UTF8);
}
