import type { Capability, KitConfig, KitType } from "@rnx-kit/config";
import type { PackageManifest } from "@rnx-kit/tools-node/package";

export type AlignDepsConfig = {
  kitType: Required<KitConfig>["kitType"];
  alignDeps: Required<Required<KitConfig>["alignDeps"]>;
  manifest: PackageManifest;
};

export type Change =
  | { type: "added"; dependency: string; target: string }
  | { type: "changed"; dependency: string; target: string; current: string }
  | { type: "removed"; dependency: string };

export type Changes = {
  dependencies: Change[];
  peerDependencies: Change[];
  devDependencies: Change[];
};

export type Options = {
  presets: string[];
  loose: boolean;
  migrateConfig: boolean;
  verbose: boolean;
  write: boolean;
  excludePackages?: string[];
  requirements?: string[];
};

export type Args = Pick<Options, "loose" | "verbose" | "write"> & {
  "exclude-packages"?: string | number;
  "migrate-config": boolean;
  "set-version"?: string | number;
  init?: string;
  packages?: (string | number)[];
  presets?: string | number;
  requirements?: string | number;
};

export type DependencyType = "direct" | "development" | "peer";

export type ErrorCode =
  | "success"
  | "excluded"
  | "invalid-app-requirements"
  | "invalid-configuration"
  | "invalid-manifest"
  | "missing-react-native"
  | "not-configured"
  | "unsatisfied";

export type Command = (manifest: string) => ErrorCode;

export type MetaPackage = {
  name: "#meta";
  capabilities: Capability[];
  devOnly?: boolean;
  [key: symbol]: string;
};

export type Package = {
  name: string;
  version: string;
  capabilities?: Capability[];
  devOnly?: boolean;
  [key: symbol]: string;
};

export type Profile = Readonly<Record<Capability, MetaPackage | Package>>;

export type Preset = Record<string, Profile>;

export type ExcludedPackage = Package & {
  reason: string;
};

export type ManifestProfile = Pick<
  Required<PackageManifest>,
  "dependencies" | "devDependencies" | "peerDependencies"
> & {
  unmanagedCapabilities: Record<string, string | undefined>;
};

export type LegacyCheckConfig = {
  kitType: KitType;
  reactNativeVersion: string;
  reactNativeDevVersion?: string;
  capabilities: Capability[];
  customProfiles?: string;
  manifest: PackageManifest;
};
