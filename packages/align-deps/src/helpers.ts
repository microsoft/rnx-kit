import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { writePackage } from "@rnx-kit/tools-node/package";
import detectIndent from "detect-indent";
import fs from "fs";
import semverValidRange from "semver/ranges/valid";

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

      return versionRange
        .split(" ")
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
