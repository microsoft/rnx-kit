import type { Lockfile } from "../types.ts";

function extractSpecifier(entry: string): string {
  return entry.substring(entry.lastIndexOf("@") + 1);
}

function normalize(s: string): string {
  return s.replaceAll('"', "").trim();
}

/**
 * Parses a Classic Yarn lockfile.
 *
 * Note: Yarn v1 lockfiles are YAML-like but not valid YAML.
 */
export function parseLockfileV1(data: string): Lockfile {
  const lockfile: Lockfile = {};

  const VERSION = "version ";
  const VERSION_OFFSET = VERSION.length;

  let current = "";
  let start = 0;
  let end = data.indexOf("\n");
  do {
    const line = data.substring(start, end);
    if (line) {
      if (line.startsWith(" ")) {
        if (current) {
          const version = line.indexOf(VERSION);
          if (version > 0) {
            const key = normalize(current.slice(0, -1));
            const entries = key.split(",");
            lockfile[key] = {
              package: entries[0].substring(0, entries[0].lastIndexOf("@")),
              specifiers: entries.map(extractSpecifier),
              resolution: normalize(line.substring(version + VERSION_OFFSET)),
            };
            current = "";
          }
        }
      } else {
        current = line;
      }
    }

    start = end + 1;
    end = data.indexOf("\n", start);
  } while (end > 0);

  return lockfile;
}
