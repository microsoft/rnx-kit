import { expandPlatformExtensions } from "@rnx-kit/tools-react-native/platform";
import * as path from "node:path";
import type { ResolutionContextCompat } from "../types";

export function getFromDir({
  originModulePath,
}: ResolutionContextCompat): string {
  return originModulePath ? path.dirname(originModulePath) : process.cwd();
}

export function makeEnhancedResolveOptions(
  {
    extraNodeModules,
    mainFields,
    sourceExts,
    unstable_conditionNames,
    unstable_enablePackageExports,
  }: ResolutionContextCompat,
  platform = "common"
) {
  const extensions = sourceExts.map((ext) => `.${ext}`);
  return {
    // Map Metro's `context.extraNodeModules` to Webpack's `resolve.alias`.
    // Metro's implementation is a subset of Webpack's. See:
    // - https://facebook.github.io/metro/docs/resolution
    // - https://webpack.js.org/configuration/resolve/#resolvealias
    alias: extraNodeModules,
    aliasFields: ["browser"],

    // Add `require` to handle packages that are missing `default`
    // conditional. See
    // https://github.com/webpack/enhanced-resolve/issues/313
    conditionNames: unstable_enablePackageExports
      ? unstable_conditionNames.slice()
      : ["require", "node"],

    // Unless `unstable_enablePackageExports` is enabled, disable exports
    // map as it currently takes precedence over the `react-native` field.
    ...(unstable_enablePackageExports ? undefined : { exportsFields: [] }),

    extensions:
      platform === "common"
        ? extensions
        : expandPlatformExtensions(platform, extensions),
    mainFields: mainFields.slice(),
  };
}
