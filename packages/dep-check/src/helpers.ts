import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { writePackage } from "@rnx-kit/tools-node/package";
import detectIndent from "detect-indent";
import fs from "fs";

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
