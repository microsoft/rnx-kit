import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { writePackage } from "@rnx-kit/tools-node/package";
import detectIndent from "detect-indent";
import fs from "fs";
import semverCoerce from "semver/functions/coerce";

export function compare<T>(lhs: T, rhs: T): -1 | 0 | 1 {
  if (lhs === rhs) {
    return 0;
  } else if (lhs < rhs) {
    return -1;
  } else {
    return 1;
  }
}

export function concatVersionRanges(versions: string[]): string {
  return "^" + versions.join(" || ^");
}

export function dropPatchFromVersion(version: string): string {
  return version
    .split("||")
    .map((v) => {
      const coerced = semverCoerce(v);
      if (!coerced) {
        throw new Error(`Invalid version number: ${v}`);
      }
      return `${coerced.major}.${coerced.minor}`;
    })
    .join(" || ");
}

export function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}

export function modifyManifest(
  pkgPath: string,
  manifest: PackageManifest
): void {
  const content = fs.readFileSync(pkgPath, { encoding: "utf-8" });
  const indent = detectIndent(content).indent || "  ";
  writePackage(pkgPath, manifest, indent);
}

export function omitEmptySections(manifest: PackageManifest): PackageManifest {
  const sections = ["dependencies", "peerDependencies", "devDependencies"];
  for (const sectionName of sections) {
    const section = manifest[sectionName];
    if (typeof section === "object" && Object.keys(section).length === 0) {
      delete manifest[sectionName];
    }
  }
  return manifest;
}
