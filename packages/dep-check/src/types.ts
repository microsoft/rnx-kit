import type { Capability, KitType } from "@rnx-kit/config";

export type Args = {
  "custom-profiles"?: string | number;
  "exclude-packages"?: string | number;
  "package-json"?: string | number;
  "set-version"?: string | number;
  init?: string;
  vigilant?: string | number;
  write: boolean;
};

export type CapabilitiesOptions = {
  kitType?: KitType;
  customProfilesPath?: string;
};

export type Command = (manifest: string) => number;

export type DependencyType = "direct" | "development" | "peer";

export type Options = {
  customProfiles?: string;
  uncheckedReturnCode?: number;
  write?: boolean;
};

export type Package = {
  name: string;
  version: string;
  devOnly?: boolean;
};

export type PackageManifest = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type Profile = Readonly<Record<Capability, Package>>;

export type ProfileVersion = "0.61" | "0.62" | "0.63" | "0.64" | "0.65";

export type ResolverOptions = { moduleResolver?: typeof require.resolve };

export type ExcludedPackage = Package & {
  reason: string;
};
