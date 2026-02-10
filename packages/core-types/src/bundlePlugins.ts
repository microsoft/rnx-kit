import type { BuildOptions } from "esbuild";

/**
 * Options for @rnx-kit/metro-plugin-cyclic-dependencies-detector plugin.
 */
export type CyclicDetectorOptions = {
  includeNodeModules?: boolean;
  linesOfContext?: number;
  throwOnError?: boolean;
};

/**
 * Options for @rnx-kit/metro-plugin-duplicates-checker plugin.
 */
export type DuplicateDetectorOptions = {
  ignoredModules?: readonly string[];
  bannedModules?: readonly string[];
  throwOnError?: boolean;
};

/**
 * Options for @rnx-kit/metro-serializer-esbuild plugin.
 */
export type EsbuildOptions = Pick<
  BuildOptions,
  | "drop"
  | "logLevel"
  | "minify"
  | "minifyWhitespace"
  | "minifyIdentifiers"
  | "minifySyntax"
  | "pure"
  | "target"
> & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
  metafile?: string;
  sourceMapPaths?: "absolute" | "relative";
  strictMode?: boolean;
};

export type TypeScriptValidationOptions = {
  /**
   * Controls whether an error is thrown when type-validation fails.
   */
  throwOnError?: boolean;
};

export type Plugin = string | [string, Record<string, unknown>];

/**
 * Parameters controlling bundler plugins.
 */
export type BundlerPlugins = {
  /**
   * Choose whether to detect cycles in the dependency graph. `true` uses defaults,
   * while `CyclicDetectorOptions` lets you control the detection process.
   *
   * @deprecated Replaced by `plugins`
   */
  detectCyclicDependencies?: boolean | CyclicDetectorOptions;

  /**
   * Choose whether to detect duplicate packages in the dependency graph. `true` uses defaults,
   * while `DuplicateDetectorOptions` lets you control the detection process.
   *
   * @deprecated Replaced by `plugins`
   */
  detectDuplicateDependencies?: boolean | DuplicateDetectorOptions;

  /**
   * Choose whether to type-check source files using TypeScript. `true` uses defaults,
   * while `TypeScriptValidationOptions` lets you control the validation process.
   *
   * @deprecated Replaced by `plugins`
   */
  typescriptValidation?: boolean | TypeScriptValidationOptions;
};
