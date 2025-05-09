import type { CustomResolver, Resolution } from "metro-resolver";
import type { NapiResolveOptions, ResolverFactory } from "oxc-resolver";
import type { ResolutionContextCompat } from "../types";
import { isAssetFile, resolveAsset } from "../utils/assets";
import { getFromDir, makeEnhancedResolverConfig } from "./enhanced-resolve";

function makeOxcResolverConfig(
  context: ResolutionContextCompat,
  platform = "common"
): NapiResolveOptions {
  const { alias, ...config } = makeEnhancedResolverConfig(context, platform);
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
  const resolvers: Record<string, ResolverFactory> = {};
  return (context: ResolutionContextCompat, platform = "common") => {
    if (!resolvers[platform]) {
      const {
        ResolverFactory,
      }: typeof import("oxc-resolver") = require("oxc-resolver");
      resolvers[platform] = new ResolverFactory(
        makeOxcResolverConfig(context, platform)
      );
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
