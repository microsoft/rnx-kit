import fs from "fs";
import { capabilitiesFor } from "./capabilities";
import { CapabilitiesOptions } from "./types";

export function initializeConfig(
  packageManifest: string,
  options: CapabilitiesOptions
): void {
  const manifest = JSON.parse(
    fs.readFileSync(packageManifest, { encoding: "utf-8" })
  );
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
  fs.writeFileSync(
    packageManifest,
    JSON.stringify(updatedManifest, undefined, 2) + "\n"
  );
}
