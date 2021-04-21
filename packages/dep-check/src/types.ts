import type { Capability } from "@rnx-kit/config";

export type DependencyType = "direct" | "development" | "peer";

export type Options = {
  check?: boolean;
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

export type ExcludedPackage = Package & {
  reason: string;
};

export type Profile = Readonly<Partial<Record<Capability, Package>>>;
