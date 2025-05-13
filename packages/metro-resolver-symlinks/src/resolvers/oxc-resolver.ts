import type { CustomResolver, Resolution } from "metro-resolver";
import type { NapiResolveOptions, ResolverFactory } from "oxc-resolver";
import type { ResolutionContextCompat } from "../types";
import { isAssetFile, resolveAsset } from "../utils/assets";
import {
  getFromDir,
  makeEnhancedResolveOptions,
} from "../utils/enhancedResolveHelpers";
import { importResolver } from "../utils/package";

function makeOxcResolverOptions(
  context: ResolutionContextCompat,
  platform = "common"
): NapiResolveOptions {
  const { alias, ...config } = makeEnhancedResolveOptions(context, platform);
  return {
    ...config,
    alias: alias
      ? Object.fromEntries(
          Object.entries(alias).map(([name, alias]) => [name, [alias]])
        )
      : {},
  };
}

const getOxcResolver = (() => {
  let sharedResolver: ResolverFactory;
  const resolvers: Record<string, ResolverFactory> = {};
  return (context: ResolutionContextCompat, platform = "common") => {
    if (!resolvers[platform]) {
      const options = makeOxcResolverOptions(context, platform);
      if (!sharedResolver) {
        const { ResolverFactory } = importResolver("oxc-resolver");
        sharedResolver = new ResolverFactory(options);
        resolvers[platform] = sharedResolver;
      } else {
        resolvers[platform] = sharedResolver.cloneWithOptions(options);
      }
    }
    return resolvers[platform];
  };
})();

export function applyOxcResolver(
  _resolve: CustomResolver,
  context: ResolutionContextCompat,
  moduleName: string,
  platform: string
): Resolution {
  if (!platform) {
    return { type: "empty" };
  }

  const oxcResolve = getOxcResolver(context, platform);
  const { path: filePath } = oxcResolve.sync(getFromDir(context), moduleName);
  if (!filePath) {
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
