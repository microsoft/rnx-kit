import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type { Project } from "@rnx-kit/typescript-service";
import type { DeltaResult, ReadOnlyGraph } from "metro";
import type ts from "typescript";

export type ProjectInfo = {
  tsproject: Project;
  tssourceFiles: Set<string>;
};

/**
 * Collection of TypeScript projects, separated by their target platform.
 *
 * Target platform is a react-native concept, not a TypeScript concept.
 * However, each project is configured with react-native module resolution,
 * which means the module file graph could vary by platform. And that means
 * each platform could yield different type errors.
 *
 * For example, `import { f } from "./utils"` could load `./utils.android.ts`
 * for Android and `./utils.ios.ts` iOS.
 */
export type ProjectCache = {
  /**
   * Discard all cached projects targeting a specific platform.
   *
   * @param platform Target platform
   */
  clearPlatform(platform: AllPlatforms): void;

  /**
   * Get info on the project which targets a specific platform and contains a specific
   * source file. If the project is not cached, load it and add it to the cache.
   *
   * @param platform Target platform
   * @param sourceFile Source file
   * @returns Project targeting the given platform and containing the given source file
   */
  getProjectInfo(
    sourceFile: string,
    platform: AllPlatforms
  ): ProjectInfo | undefined;
};

export type SerializerHook = (graph: ReadOnlyGraph, delta: DeltaResult) => void;

/**
 * Context to use when invoking this resolver
 */
export type ResolverContext = Readonly<{
  /**
   * Host interface for handling module resolution queries.
   */
  host: ts.LanguageServiceHost;

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
  disableReactNativePackageSubstitution: boolean;

  /**
   * Target platform.
   */
  platform: AllPlatforms;

  /**
   * List of react-native platform file extensions, such as ".native".
   * Ordered from highest precedence (index 0) to lowest.
   */
  platformFileExtensions: string[];

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
  replaceReactNativePackageName: (moduleName: string) => string;
}>;
