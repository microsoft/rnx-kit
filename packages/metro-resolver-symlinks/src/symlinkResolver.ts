import { normalizePath } from "@rnx-kit/tools-node";
import type {
  CustomResolver,
  Resolution,
  ResolutionContext,
} from "metro-resolver";
import { requireModuleFromMetro } from "./helper";
import { remapReactNativeModule, resolveModulePath } from "./resolver";
import type { MetroResolver, Options } from "./types";
import { applyEnhancedResolver } from "./utils/enhancedResolve";
import {
  patchMetro,
  shouldEnableRetryResolvingFromDisk,
} from "./utils/patchMetro";
import { remapImportPath } from "./utils/remapImportPath";

function applyMetroResolver(
  resolve: CustomResolver,
  ctx: ResolutionContext,
  moduleName: string,
  platform: string
): Resolution {
  // Resolve redirects before we try to resolve the module:
  // https://github.com/facebook/metro/blob/v0.76.7/docs/Resolution.md#redirectmodulepath-string--string--false
  const realModuleName = ctx.redirectModulePath(moduleName);
  if (realModuleName === false) {
    return { type: "empty" };
  }

  const modifiedModuleName = resolveModulePath(ctx, realModuleName, platform);
  // @ts-expect-error We pass 4 arguments instead of 3 to be backwards compatible
  return resolve(ctx, normalizePath(modifiedModuleName), platform, null);
}

export function makeResolver(options: Options = {}): MetroResolver {
  const { resolve: metroResolver } =
    requireModuleFromMetro<typeof import("metro-resolver")>("metro-resolver");

  const { remapModule = (_, moduleName, __) => moduleName } = options;

  const enableRetryResolvingFromDisk =
    shouldEnableRetryResolvingFromDisk(options);

  const applyResolver = enableRetryResolvingFromDisk
    ? applyEnhancedResolver
    : applyMetroResolver;

  if (enableRetryResolvingFromDisk) {
    patchMetro(options);
  }

  const remappers = [remapModule, remapReactNativeModule];
  const symlinkResolver = (
    context: ResolutionContext,
    moduleName: string,
    platform: string | null,
    requestedModuleName?: string
  ) => {
    let resolve: CustomResolver = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (resolveRequest === symlinkResolver) {
      // @ts-expect-error We intentionally delete `resolveRequest` here and restore it later
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
          // @ts-expect-error We pass 4 arguments instead of 3 to be backwards compatible
          return resolve(context, requestedModuleName, platform, null);
        } finally {
          // @ts-expect-error We intentionally deleted `resolveRequest` and restore it here
          context.resolveRequest = resolveRequest;
        }
      }
    } else if (resolveRequest) {
      resolve = resolveRequest;
    }

    try {
      // If a module was excluded, `_getEmptyModule()` will be called with no
      // platform set. We should let Metro handle this without interfering. See
      // https://github.com/facebook/metro/blob/v0.71.0/packages/metro/src/node-haste/DependencyGraph/ModuleResolution.js#L97
      if (!platform) {
        // @ts-expect-error We pass 4 arguments instead of 3 to be backwards compatible
        return resolve(context, moduleName, platform, null);
      }

      const modifiedModuleName = remappers.reduce(
        (modifiedName, remap) => remap(context, modifiedName, platform),
        moduleName
      );

      return applyResolver(resolve, context, modifiedModuleName, platform);
    } finally {
      if (!context.resolveRequest) {
        // Restoring `resolveRequest` must happen last
        // @ts-expect-error We intentionally deleted `resolveRequest` and restore it here
        context.resolveRequest = resolveRequest;
      }
    }
  };
  return symlinkResolver as MetroResolver;
}

makeResolver.remapImportPath = remapImportPath;
