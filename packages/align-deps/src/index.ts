import { preset as reactNativePreset } from "./presets/microsoft/react-native.ts";

export const presets = {
  "microsoft/react-native": reactNativePreset,
};

export { capabilitiesFor } from "./capabilities.ts";
export { cli, cliOptions } from "./cli.ts";
export { checkPackageManifest } from "./commands/check.ts";
export { exportCatalogs } from "./commands/exportCatalogs.ts";
export { checkPackageManifestUnconfigured } from "./commands/vigilant.ts";
export { alignDepsCommand } from "./compatibility/commander.ts";
export { updatePackageManifest } from "./manifest.ts";
export type {
  Args,
  Command,
  DependencyType,
  ExcludedPackage,
  ManifestProfile,
  MetaPackage,
  Options,
  Package,
  Preset,
  Profile,
} from "./types.ts";
