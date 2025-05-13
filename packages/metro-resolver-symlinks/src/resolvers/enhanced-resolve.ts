import type { ResolveFunction } from "enhanced-resolve";
import type { CustomResolver, Resolution } from "metro-resolver";
import type { ResolutionContextCompat } from "../types";
import { isAssetFile, resolveAsset } from "../utils/assets";
import {
  getFromDir,
  makeEnhancedResolveOptions,
} from "../utils/enhancedResolveHelpers";
import { importResolver } from "../utils/package";

const getEnhancedResolver = (() => {
  const resolvers: Record<string, ResolveFunction> = {};
  return (context: ResolutionContextCompat, platform = "common") => {
    if (!resolvers[platform]) {
      const config = makeEnhancedResolveOptions(context, platform);
      resolvers[platform] =
        importResolver("enhanced-resolve").create.sync(config);
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
