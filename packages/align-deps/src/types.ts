import type { Capability, KitType } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node/package";

type Options = {
  customProfiles?: string;
  excludePackages?: string;
  loose: boolean;
  write: boolean;
};

export type Args = Options & {
  "custom-profiles"?: string | number;
  "exclude-packages"?: string | number;
  "set-version"?: string | number;
  init?: string;
  packages?: (string | number)[];
  vigilant?: string | number;
};

export type CheckConfig = {
  kitType: KitType;
  reactNativeVersion: string;
  reactNativeDevVersion: string;
  capabilities: Capability[];
  customProfilesPath?: string;
  manifest: PackageManifest;
};

export type CheckOptions = Options & {
  uncheckedReturnCode?: number;
  config?: number | CheckConfig;
  supportedVersions?: string;
  targetVersion?: string;
};

export type VigilantOptions = Options & {
  versions: string;
};

export type CapabilitiesOptions = {
  kitType?: KitType;
  customProfilesPath?: string;
};

export type Command = (manifest: string) => number;

export type DependencyType = "direct" | "development" | "peer";

export type MetaPackage = {
  name: "#meta";
  capabilities: Capability[];
  devOnly?: boolean;
};

export type Package = {
  name: string;
  version: string;
  capabilities?: Capability[];
  devOnly?: boolean;
};

export type ManifestProfile = PackageManifest & {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export type Profile = Readonly<Record<Capability, MetaPackage | Package>>;

export type ProfileVersion =
  | "0.61"
  | "0.62"
  | "0.63"
  | "0.64"
  | "0.65"
  | "0.66"
  | "0.67"
  | "0.68"
  | "0.69"
  | "0.70";

export type ProfileMap = Record<ProfileVersion, Profile>;

export type ProfilesInfo = {
  supportedProfiles: Profile[];
  supportedVersions: string;
  targetProfile: Profile[];
  targetVersion: string;
};

export type ExcludedPackage = Package & {
  reason: string;
};
