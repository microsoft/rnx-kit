import { capabilitiesFor } from "./capabilities";
import { readJsonFile, writeJsonFile } from "./json";
import type { CapabilitiesOptions } from "./types";

export function initializeConfig(
  packageManifest: string,
  options: CapabilitiesOptions
): void {
  const manifest = readJsonFile(packageManifest);
  if (manifest["rnx-kit"]?.["capabilities"]) {
    return;
  }

  const capabilities = capabilitiesFor(manifest, options);
  if (!capabilities?.capabilities?.length) {
    return;
  }

  const updatedManifest = {
    ...manifest,
    "rnx-kit": {
      ...manifest["rnx-kit"],
      ...capabilities,
    },
  };
  writeJsonFile(packageManifest, updatedManifest);
}
