import ts from "typescript";

/**
 * Host interface for handling module resolution queries.
 *
 * Very similar to TypeScript's ModuleResolutionHost, with some changes:
 *
 *   - `trace` and `directoryExists` are no longer optional
 *   - `getCurrentDirectory` has been removed (not needed)
 */
export type ModuleResolutionHostLike = {
  fileExists(fileName: string): boolean;
  readFile(fileName: string): string | undefined;
  trace(s: string): void;
  directoryExists(directoryName: string): boolean;
  realpath?(path: string): string;
  getDirectories(path: string): string[];
};

/**
 * Invariant context information used for resolving all modules in a program.
 */
export type ResolverContext = {
  /**
   * Host interface for handling module resolution queries.
   */
  readonly host: ModuleResolutionHostLike;

  /**
   * TypeScript compiler options.
   */
  readonly options: ts.ParsedCommandLine["options"];

  /**
   * Flag controlling the replacement of `react-native` the target platform's
   * out-of-tree NPM package implementation. For example, on Windows
   * `react-native` is assumed to refer to `react-native-windows`.
   *
   * React-native package name replacement is currently controlled by this flag
   * because the windows and mac platforms (react-native-windows,
   * react-native-macos) don't yet support it.
   *
   * react-native-windows doesn't export a complete set of react-native types,
   * leading to errors about missing names like 'AppRegistry' and 'View':
   *
   *     https://github.com/microsoft/react-native-windows/issues/8627
   *
   * react-native-macos doesn't export types, instead relying on the in-tree
   * types for ios.
   */
  readonly disableReactNativePackageSubstitution: boolean;

  /**
   * Target platform.
   */
  readonly platform: string;

  /**
   * List of react-native platform extensions, such as ".native".
   * Ordered from highest precedence (index 0) to lowest.
   */
  readonly platformExtensions: string[];

  /**
   * Function which *may* replace references to the `react-native` module with
   * the target platform's out-of-tree NPM package name. For example, on
   * Windows, the replacement would be `react-native-windows`.
   *
   * This only replaces `react-native` module references for target platforms
   * that have an out-of-tree implementation. Further, it only does the
   * substitution when `disableReactNativePackageSubstitution` (in this object)
   * is `false`.
   */
  readonly replaceReactNativePackageName: (moduleName: string) => string;
};
