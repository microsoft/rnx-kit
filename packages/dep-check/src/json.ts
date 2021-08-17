import type { KitConfig } from "@rnx-kit/config";
import fs from "fs";
import type { PackageManifest } from "./types";

type KitPackageManifest = PackageManifest & {
  "rnx-kit"?: KitConfig;
};

type ReadFileOptions =
  | { encoding: BufferEncoding; flag?: string }
  | BufferEncoding;

const defaultFileEncoding: ReadFileOptions = { encoding: "utf-8" };

export function readJsonFile<T = KitPackageManifest>(
  path: fs.PathLike,
  options: ReadFileOptions = defaultFileEncoding
): T {
  return JSON.parse(fs.readFileSync(path, options));
}

export function writeJsonFile(
  path: fs.PathLike,
  object: Record<string, unknown>,
  options: fs.WriteFileOptions = defaultFileEncoding
): void {
  fs.writeFileSync(path, JSON.stringify(object, undefined, 2) + "\n", options);
}
