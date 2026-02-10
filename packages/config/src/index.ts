export type {
  BundleConfig,
  BundleParameters,
  BundlerPlugins,
  Capability,
  DependencyVersions,
  GetDependencyVersions,
  HermesOptions,
  KitConfig,
  KitType,
  MetaCapability,
  ServerConfig,
  TypeScriptValidationOptions,
} from "@rnx-kit/core-types";

export { getBundleConfig, getPlatformBundleConfig } from "./getBundleConfig.ts";

export { getKitCapabilities } from "./getKitCapabilities.ts";
export type { KitCapabilities } from "./getKitCapabilities.ts";

export {
  getKitConfig,
  getKitConfigFromPackageInfo,
  getKitConfigFromPackageManifest,
} from "./getKitConfig.ts";
export type { GetKitConfigOptions } from "./getKitConfig.ts";
