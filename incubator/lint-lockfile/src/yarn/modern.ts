import * as yaml from "js-yaml";
import type { Lockfile } from "../types.ts";

type YarnLockEntry = {
  version: string;
  linkType: "hard" | "soft";
};

type YarnLock = Record<string, YarnLockEntry>;

function extractSpecifier(entry: string): string {
  return entry.substring(entry.lastIndexOf("@") + 1);
}

/**
 * Parses a Modern Yarn lockfile.
 */
export function parseLockfileV2(data: string): Lockfile {
  const lockfile: Lockfile = {};
  for (const [key, entry] of Object.entries(yaml.load(data) as YarnLock)) {
    const entries = key.split(",");
    lockfile[key] = {
      package: entries[0].substring(0, entries[0].lastIndexOf("@")),
      specifiers: entries.map(extractSpecifier),
      resolution: entry.version,
    };
  }
  delete lockfile["__metadata"];
  return lockfile;
}
