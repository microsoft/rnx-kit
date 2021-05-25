import type { KitType } from "@rnx-kit/config";
import fs from "fs";
import { capabilitiesFor } from "./capabilities";

type Options = {
  kitType?: string;
  customProfilesPath?: string;
};

function ensureKitType(type: string | undefined): KitType | undefined {
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
  options: Options
): void {
  const manifest = JSON.parse(
    fs.readFileSync(packageManifest, { encoding: "utf-8" })
  );
  if (manifest["rnx-kit"]?.["capabilities"]) {
    return;
  }

  const capabilities = capabilitiesFor(manifest, {
    ...options,
    kitType: ensureKitType(options.kitType),
  });
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
