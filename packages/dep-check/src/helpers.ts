import { warn } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { writePackage } from "@rnx-kit/tools-node/package";
import detectIndent from "detect-indent";
import fs from "fs";

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

export function printMigrationMessage(): void {
  const banner =
    "⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️   ⚠️";

  warn(banner);
  warn("'@rnx-kit/dep-check' has been renamed to '@rnx-kit/align-deps'!");
  warn(
    "You can replace '@rnx-kit/dep-check' with '@rnx-kit/align-deps' in your 'package.json' and your configurations will be automatically upgraded."
  );
  warn(
    "For reasoning and more details, you can read the RFC: https://github.com/microsoft/rnx-kit/pull/1757"
  );
  warn(banner);
}
