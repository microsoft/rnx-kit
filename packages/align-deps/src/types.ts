import type {
  AlignDepsConfig,
  Capability,
  KitType,
  PackageManifest,
} from "@rnx-kit/core-types";

export type AlignDepsOptions = {
  kitType: KitType;
  alignDeps: Required<AlignDepsConfig>;
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
  capabilities: { type: "unmanaged"; dependency: string; capability: string }[];
};

export type DiffMode = "strict" | "allow-subset";

export type Options = {
  presets: string[];
  loose: boolean;
  migrateConfig: boolean;
  noUnmanaged: boolean;
  verbose: boolean;
  write: boolean;
  diffMode?: DiffMode;
  excludePackages?: string[];
  requirements?: string[];
};

export type Args = Pick<Options, "loose" | "verbose" | "write"> & {
  "diff-mode"?: string;
  "exclude-packages"?: string | number;
  "export-catalogs"?: string;
  "migrate-config": boolean;
  "no-unmanaged": boolean;
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

export type Command =
  | (((manifest: string) => ErrorCode) & { isRootCommand?: false })
  | ((() => ErrorCode) & { isRootCommand: true });

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
