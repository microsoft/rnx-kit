import type {
  CyclicDependencyPluginOptions,
  DuplicateDetectorPluginOptions,
  TypeScriptPluginOptions,
} from "@rnx-kit/types-bundle-plugin-options";

export type Plugin = string | [string, Record<string, unknown>];

/**
 * Parameters controlling bundler plugins.
 */
export type BundlerPlugins = {
  /**
   * Choose whether to detect cycles in the dependency graph. `true` uses defaults,
   * while `CyclicDependencyPluginOptions` lets you control the detection process.
   *
   * @deprecated Replaced by `plugins`
   */
  detectCyclicDependencies?: boolean | CyclicDependencyPluginOptions;

  /**
   * Choose whether to detect duplicate packages in the dependency graph. `true` uses defaults,
   * while `DuplicateDetectorPluginOptions` lets you control the detection process.
   *
   * @deprecated Replaced by `plugins`
   */
  detectDuplicateDependencies?: boolean | DuplicateDetectorPluginOptions;

  /**
   * Choose whether to type-check source files using TypeScript. `true` uses defaults,
   * while `TypeScriptPluginOptions` lets you control the validation process.
   *
   * @deprecated Replaced by `plugins`
   */
  typescriptValidation?: boolean | TypeScriptPluginOptions;
};
