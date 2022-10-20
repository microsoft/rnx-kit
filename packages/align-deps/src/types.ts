import type { Capability, KitConfig, KitType } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node/package";

export type AlignDepsConfig = {
  kitType: Required<KitConfig>["kitType"];
  alignDeps: Required<Required<KitConfig>["alignDeps"]>;
  manifest: PackageManifest;
};

export type Options = {
  presets: string[];
  loose: boolean;
  write: boolean;
  excludePackages?: string[];
  requirements?: string[];
};

export type Args = Pick<Options, "loose" | "write"> & {
  "exclude-packages"?: string | number;
  "set-version"?: string | number;
  init?: string;
  packages?: (string | number)[];
  presets?: string | number;
  requirements?: string | number;
};

export type CheckConfig = {
  kitType: KitType;
  reactNativeVersion: string;
  reactNativeDevVersion: string;
  capabilities: Capability[];
  customProfilesPath?: string;
  manifest: PackageManifest;
};

export type ErrorCode =
  | "success"
  | "invalid-configuration"
  | "invalid-manifest"
  | "missing-react-native"
  | "not-configured"
  | "unsatisfied";

export type CapabilitiesOptions = {
  kitType?: KitType;
  customProfilesPath?: string;
};

export type Command = (manifest: string) => ErrorCode;

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

export type Preset = Record<string, Profile>;
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
