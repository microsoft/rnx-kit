import { preset as reactNativePreset } from "./presets/microsoft/react-native";

export const presets = {
  "microsoft/react-native": reactNativePreset,
};

export { capabilitiesFor } from "./capabilities";
export { cli, cliOptions } from "./cli";
export { checkPackageManifest } from "./commands/check";
export { checkPackageManifestUnconfigured } from "./commands/vigilant";
export { alignDepsCommand } from "./compatibility/commander";
export { updatePackageManifest } from "./manifest";
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
} from "./types";
