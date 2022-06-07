import { normalizePath } from "@rnx-kit/tools-node";
import type { CustomResolver, ResolutionContext } from "metro-resolver";
import {
  getMetroResolver,
  remapReactNativeModule,
  resolveModulePath,
} from "./resolver";
import type { MetroResolver, Options } from "./types";
import { remapImportPath } from "./utils/remapImportPath";

export function makeResolver({
  remapModule = (_, moduleName, __) => moduleName,
}: Options = {}): MetroResolver {
  const metroResolver = getMetroResolver();
  const remappers = [remapModule, remapReactNativeModule, resolveModulePath];

  const symlinkResolver = (
    context: ResolutionContext,
    moduleName: string,
    platform: string | null,
    requestedModuleName?: string
  ) => {
    let resolve: CustomResolver = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (resolveRequest === symlinkResolver) {
      delete context.resolveRequest;

      // Metro enters a different code path than it should when `resolveRequest`
      // is set and the target package uses the `browser` field to redirect
      // modules. If detected, we need to unset `resolveRequest` and retry with
      // Metro's resolver to avoid interference.
      //
      // Ref: https://github.com/facebook/metro/blob/v0.67.0/packages/metro-resolver/src/resolve.js#L59
      if (
        typeof requestedModuleName === "string" &&
        requestedModuleName !== moduleName
      ) {
        try {
          return resolve(context, requestedModuleName, platform, null);
        } finally {
          context.resolveRequest = resolveRequest;
        }
      }
    } else if (resolveRequest) {
      resolve = resolveRequest;
    }

    try {
      // If a module was excluded, `_getEmptyModule()` will be called with no
      // platform set. We should let Metro handle this without interfering. See
      // https://github.com/facebook/metro/blob/e7419900d2e063f2d531313f810d18c487f807f8/packages/metro/src/node-haste/DependencyGraph/ModuleResolution.js#L97
      if (!platform) {
        return resolve(context, moduleName, platform, null);
      }

      const modifiedModuleName = remappers.reduce(
        (modifiedName, remap) => remap(context, modifiedName, platform),
        moduleName
      );

      return resolve(
        context,
        normalizePath(modifiedModuleName),
        platform,
        null
      );
    } finally {
      if (!context.resolveRequest) {
        // Restoring `resolveRequest` must happen last
        context.resolveRequest = resolveRequest;
      }
    }
  };
  return symlinkResolver as MetroResolver;
}

makeResolver.remapImportPath = remapImportPath;
