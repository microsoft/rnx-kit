import type { KitType } from "@rnx-kit/config";
import { error } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node/package";
import { capabilitiesFor } from "./capabilities";
import { modifyManifest } from "./helpers";
import type { CapabilitiesOptions, Command } from "./types";

function ensureKitType(type: string): KitType | undefined {
  switch (type) {
    case "app":
    case "library":
      return type;
    default:
      return undefined;
  }
}

export function initializeConfig(
  packageManifest: string,
  options: CapabilitiesOptions
): void {
  const manifest = readPackage(packageManifest);
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
      ...(options.customProfilesPath
        ? { customProfiles: options.customProfilesPath }
        : undefined),
    },
  };
  modifyManifest(packageManifest, updatedManifest);
}

export function makeInitializeCommand(
  kitType: string,
  customProfiles: string | undefined
): Command | undefined {
  const verifiedKitType = ensureKitType(kitType);
  if (!verifiedKitType) {
    error(`Invalid kit type: '${kitType}'`);
    return undefined;
  }

  return (manifest: string) => {
    initializeConfig(manifest, {
      kitType: verifiedKitType,
      customProfilesPath: customProfiles,
    });
    return "success";
  };
}
