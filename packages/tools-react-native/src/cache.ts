import type { Config } from "@react-native-community/cli-types";
import { findUp } from "@rnx-kit/tools-node/path";
import * as crypto from "crypto";
import * as nodefs from "fs";
import * as path from "path";

const HASH_ALGO = "sha256";
const UTF8 = { encoding: "utf-8" as const };

function ensureDir(p: string, /** @internal */ fs = nodefs): void {
  fs.mkdirSync(p, { recursive: true, mode: 0o755 });
}

function makeCachePath(projectRoot: string, filename: string): string {
  return path.join(projectRoot, "node_modules", ".cache", "rnx-kit", filename);
}

function cacheStatePath(projectRoot: string): string {
  return makeCachePath(projectRoot, `config.${HASH_ALGO}`);
}

function configCachePath(projectRoot: string): string {
  return makeCachePath(projectRoot, "config.json");
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

  const configFiles = ["package.json", "react-native.config.js"];
  updateHash(sha2, configFiles, projectRoot, "all");

  const lockfiles = [
    "yarn.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bun.lockb",
  ];
  updateHash(sha2, lockfiles, projectRoot, "first-only");

  return sha2.digest("hex");
}

export function getSavedState(
  projectRoot: string,
  /** @internal */ fs = nodefs
): string | false {
  const stateFile = cacheStatePath(projectRoot);
  return fs.existsSync(stateFile) && fs.readFileSync(stateFile, UTF8);
}

export function invalidateState(
  projectRoot = process.cwd(),
  /** @internal */ fs = nodefs
) {
  fs.rmSync(configCachePath(projectRoot));
  fs.rmSync(cacheStatePath(projectRoot));
}

export function loadConfigFromCache(
  projectRoot: string,
  /** @internal */ fs = nodefs
): Config | null {
  const cacheFile = configCachePath(projectRoot);
  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  const config = fs.readFileSync(cacheFile, UTF8);
  return JSON.parse(config);
}

export function saveConfigToCache(
  projectRoot: string,
  state: string,
  config: Config,
  /** @internal */ fs = nodefs
): void {
  const data = JSON.stringify(config);

  const configPath = configCachePath(projectRoot);
  ensureDir(path.dirname(configPath), fs);

  fs.writeFileSync(configPath, data, UTF8);
  fs.writeFileSync(cacheStatePath(projectRoot), state, UTF8);
}
