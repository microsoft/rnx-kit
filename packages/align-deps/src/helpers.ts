import { writePackage } from "@rnx-kit/tools-node/package";
import type { PackageManifest } from "@rnx-kit/types-node";
import detectIndent from "detect-indent";
import * as nodefs from "node:fs";
import semverValidRange from "semver/ranges/valid.js";

export const dependencySections = [
  "dependencies",
  "peerDependencies",
  "devDependencies",
] as const;

export function compare<T>(lhs: T, rhs: T): -1 | 0 | 1 {
  if (lhs === rhs) {
    return 0;
  } else if (lhs < rhs) {
    return -1;
  } else {
    return 1;
  }
}

export function dropPatchFromVersion(version: string): string {
  return version
    .split("||")
    .map((input) => {
      const versionRange = input.trim();
      if (!semverValidRange(versionRange)) {
        throw new Error(`Invalid version number: ${versionRange}`);
      }

      if (!versionRange) {
        return "*";
      }

      // `>= 1.0.0` is equivalent to `>=1.0.0`, but only the latter survives
      // being split into comparators below. We limit the number of comparator
      // characters to avoid quadratic backtracking on inputs such as `<<<<…`
      // https://github.com/microsoft/rnx-kit/security/code-scanning/37
      return versionRange
        .replace(/([<>=~^]{1,2})\s+/g, "$1")
        .split(/\s+/)
        .map((v) => {
          if (v === "*" || v === "-") {
            // No need to manipulate `*` or hyphen ranges, e.g. `1.0 - 2.0`
            return v;
          }

          const [major, minor = "0"] = v.split(".");
          return major === "^0" || major === "~0"
            ? `0.${minor}`
            : `${major}.${minor}`;
        })
        .join(" ");
    })
    .join(" || ");
}

export function isString(str: unknown): str is string {
  return typeof str?.valueOf() === "string";
}

export function modifyManifest(
  pkgPath: string,
  manifest: PackageManifest,
  /** @internal */ fs = nodefs
): void {
  const content = fs.readFileSync(pkgPath, { encoding: "utf-8" });
  const indent = detectIndent(content).indent || "  ";
  writePackage(pkgPath, manifest, indent, fs);
}

export function omitEmptySections(manifest: PackageManifest): PackageManifest {
  for (const sectionName of dependencySections) {
    const section = manifest[sectionName];
    if (typeof section === "object" && Object.keys(section).length === 0) {
      delete manifest[sectionName];
    }
  }
  return manifest;
}
