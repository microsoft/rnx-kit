import { expandPlatformExtensions } from "@rnx-kit/tools-react-native/platform";
import type { CustomResolver, Resolution } from "metro-resolver";
import * as path from "node:path";
import type { ResolutionContextCompat } from "../types";
import { isAssetFile, resolveAsset } from "../utils/assets";

type Resolver = (fromDir: string, moduleId: string) => string | false;

export function getFromDir({
  originModulePath,
}: ResolutionContextCompat): string {
  return originModulePath ? path.dirname(originModulePath) : process.cwd();
}

export function makeEnhancedResolverConfig(
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

const getEnhancedResolver = (() => {
  const resolvers: Record<string, Resolver> = {};
  return (context: ResolutionContextCompat, platform = "common") => {
    if (!resolvers[platform]) {
      const config = makeEnhancedResolverConfig(context, platform);
      resolvers[platform] = require("enhanced-resolve").create.sync(config);
    }
    return resolvers[platform];
  };
})();

export function applyEnhancedResolver(
  _resolve: CustomResolver,
  context: ResolutionContextCompat,
  moduleName: string,
  platform: string
): Resolution {
  if (!platform) {
    return { type: "empty" };
  }

  const enhancedResolve = getEnhancedResolver(context, platform);
  const filePath = enhancedResolve(getFromDir(context), moduleName);
  if (filePath === false) {
    return { type: "empty" };
  }

  if (isAssetFile(context, moduleName)) {
    return resolveAsset(context, filePath);
  }

  return {
    type: "sourceFile",
    filePath,
  };
}
