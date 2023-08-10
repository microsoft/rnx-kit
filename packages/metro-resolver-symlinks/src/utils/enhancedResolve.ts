import { expandPlatformExtensions } from "@rnx-kit/tools-react-native/platform";
import type { CustomResolver, Resolution } from "metro-resolver";
import * as path from "path";
import type { ResolutionContextCompat } from "../types";

type Resolver = (fromDir: string, moduleId: string) => string | false;

const getEnhancedResolver = (() => {
  const resolvers: Record<string, Resolver> = {};
  return (context: ResolutionContextCompat, platform = "common") => {
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

function getFromDir({ originModulePath }: ResolutionContextCompat): string {
  return originModulePath ? path.dirname(originModulePath) : process.cwd();
}

/**
 * Returns whether the file at specified path is an asset.
 */
export function isAssetFile(
  context: ResolutionContextCompat,
  filePath: string
): boolean {
  const assetExts = context.assetExts;
  if (assetExts) {
    for (const ext of assetExts) {
      if (filePath.endsWith(ext)) {
        const dot = filePath.length - ext.length - 1;
        if (filePath[dot] === ".") {
          return true;
        }
      }
    }
    return false;
  }

  return Boolean(context.isAssetFile?.(filePath));
}

/**
 * Resolve a file path as an asset. Returns the set of files found after
 * expanding asset resolutions (e.g. `icon@2x.png`).
 *
 * @see {@link https://github.com/facebook/metro/commit/6e6f36fd982b9226b7daafd1c942c7be32f9af40}
 */
function resolveAsset(
  context: ResolutionContextCompat,
  filePath: string
): Resolution {
  const dirPath = path.dirname(filePath);
  const extension = path.extname(filePath);
  const basename = path.basename(filePath, extension);

  if (!/@\d+(?:\.\d+)?x$/.test(basename)) {
    try {
      const assets = context.resolveAsset(dirPath, basename, extension);
      if (assets != null) {
        return {
          type: "assetFiles",
          filePaths: assets,
        };
      }
    } catch (e) {
      //
    }
  }

  return {
    type: "assetFiles",
    filePaths: [filePath],
  };
}

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
