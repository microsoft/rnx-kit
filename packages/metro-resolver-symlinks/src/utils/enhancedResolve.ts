import { expandPlatformExtensions } from "@rnx-kit/tools-react-native/platform";
import type {
  CustomResolver,
  Resolution,
  ResolutionContext,
} from "metro-resolver";
import * as path from "path";

type Resolver = (fromDir: string, moduleId: string) => string | false;

const getEnhancedResolver = (() => {
  const resolvers: Record<string, Resolver> = {};
  return (context: ResolutionContext, platform = "common") => {
    if (!resolvers[platform]) {
      const {
        mainFields,
        sourceExts,
        unstable_conditionNames,
        unstable_enablePackageExports,
      } = context;
      const extensions = sourceExts.map((ext) => `.${ext}`);
      resolvers[platform] = require("enhanced-resolve").create.sync({
        // Map Metro's `context.extraNodeModules` to Webpack's `resolve.alias`.
        // Metro's implementation is a subset of Webpack's. See:
        // - https://facebook.github.io/metro/docs/resolution
        // - https://webpack.js.org/configuration/resolve/#resolvealias
        alias: context.extraNodeModules,
        aliasFields: ["browser"],

        // Add `require` to handle packages that are missing `default`
        // conditional. See
        // https://github.com/webpack/enhanced-resolve/issues/313
        conditionNames: unstable_enablePackageExports
          ? unstable_conditionNames
          : ["require", "node"],

        // Unless `unstable_enablePackageExports` is enabled, disable exports
        // map as it currently takes precedence over the `react-native` field.
        ...(unstable_enablePackageExports ? undefined : { exportsFields: [] }),

        extensions:
          platform === "common"
            ? extensions
            : expandPlatformExtensions(platform, extensions),
        mainFields,
      });
    }
    return resolvers[platform];
  };
})();

function getFromDir({ originModulePath }: ResolutionContext): string {
  return originModulePath ? path.dirname(originModulePath) : process.cwd();
}

export function applyEnhancedResolver(
  _resolve: CustomResolver,
  context: ResolutionContext,
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

  return {
    type: "sourceFile",
    filePath,
  };
}
