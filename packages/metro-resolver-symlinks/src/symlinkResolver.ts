import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { CustomResolver } from "metro-resolver";
import { applyMetroResolver, remapReactNativeModule } from "./resolver";
import type { MetroResolver, Options, ResolutionContextCompat } from "./types";
import { applyEnhancedResolver } from "./utils/enhancedResolve";
import {
  patchMetro,
  shouldEnableRetryResolvingFromDisk,
} from "./utils/patchMetro";
import { remapImportPath } from "./utils/remapImportPath";

export function makeResolver(options: Options = {}): MetroResolver {
  const { resolve: metroResolver } = requireModuleFromMetro("metro-resolver");

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
    context: ResolutionContextCompat,
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
