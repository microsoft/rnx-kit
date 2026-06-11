import type { CustomResolver, Resolution } from "metro-resolver";
import * as path from "node:path";
import type { NapiResolveOptions, ResolverFactory } from "oxc-resolver";
import type { ResolutionContextCompat } from "../types.ts";
import { isAssetFile, resolveAsset } from "../utils/assets.ts";
import {
  getFromDir,
  makeEnhancedResolveOptions,
} from "../utils/enhancedResolveHelpers.ts";
import { importResolver } from "../utils/package.ts";

function makeOxcResolverOptions(
  context: ResolutionContextCompat,
  platform = "common"
): NapiResolveOptions {
  const { alias, conditionNames, ...config } = makeEnhancedResolveOptions(
    context,
    platform
  );
  if (conditionNames.length === 1 && conditionNames[0] === "react-native") {
    // By default, `react-native` is the only condition name provided.
    // oxc-resolver does not provide fallbacks; we have to add them explicitly.
    // https://github.com/react/react-native/blob/v0.85.3/packages/metro-config/src/index.flow.js#L59
    conditionNames.push("import", "require", "default");
  }
  return {
    ...config,
    alias: alias
      ? Object.fromEntries(
          Object.entries(alias).map(([name, alias]) => [name, [alias]])
        )
      : {},
    conditionNames,
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
  const fromDir = getFromDir(context);
  const { error, path: filePath } = oxcResolve.sync(fromDir, moduleName);
  if (error) {
    const { originModulePath } = context;
    const origin = originModulePath
      ? path.relative(process.cwd(), originModulePath)
      : ".";
    throw new Error(`${origin}: ${error}`);
  }

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
