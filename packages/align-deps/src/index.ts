import { preset as reactNativePreset } from "./presets/microsoft/react-native";

export const presets = {
  "microsoft/react-native": reactNativePreset,
};

export { capabilitiesFor } from "./capabilities";
export { checkPackageManifest } from "./check";
export { cli } from "./cli";
export { updatePackageManifest } from "./manifest";

export type {
  Args,
  CapabilitiesOptions,
  CheckOptions,
  Command,
  DependencyType,
  ExcludedPackage,
  ManifestProfile,
  MetaPackage,
  Package,
  Profile,
  ProfilesInfo,
  ProfileVersion,
  VigilantOptions,
} from "./types";
