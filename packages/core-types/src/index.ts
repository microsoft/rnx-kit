export type {
  AlignDepsConfig,
  Capability,
  MetaCapability,
} from "./alignDeps.ts";

export type {
  BundleConfig,
  BundleOutputOptions,
  BundleParameters,
  HermesOptions,
} from "./bundleConfig.ts";

export type {
  BundlerPlugins,
  CyclicDetectorOptions,
  DuplicateDetectorOptions,
  EsbuildOptions,
  Plugin,
  TypeScriptValidationOptions,
} from "./bundlePlugins.ts";

// export types from kitConfig.ts
export type {
  DependencyVersions,
  GetDependencyVersions,
  KitConfig,
  KitType,
} from "./kitConfig.ts";

// export types from lint.types.ts
export type {
  NoDuplicatesRuleOptions,
  NoWorkspacePackageFromNpmRuleOptions,
  RuleBaseOptions,
} from "./lint.types.ts";

// export types from platforms.ts
export { ALL_PLATFORM_VALUES } from "./platforms.ts";
export type { AllPlatforms } from "./platforms.ts";

// export types from serverConfig.ts
export type { ServerConfig } from "./serverConfig.ts";
