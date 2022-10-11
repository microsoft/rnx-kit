export { capabilitiesFor } from "./capabilities";
export { cli } from "./cli";
export { checkPackageManifest } from "./commands/check";
export { checkPackageManifestUnconfigured } from "./commands/vigilant";
export { updatePackageManifest } from "./manifest";
export type {
  Args,
  CapabilitiesOptions,
  Command,
  DependencyType,
  ExcludedPackage,
  ManifestProfile,
  MetaPackage,
  Options,
  Package,
  Profile,
  ProfilesInfo,
  ProfileVersion,
} from "./types";
