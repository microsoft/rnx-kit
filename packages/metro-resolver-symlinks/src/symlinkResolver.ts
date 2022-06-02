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
    if (!platform) {
      throw new Error("No platform was specified");
    }

    let resolve: CustomResolver = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (resolveRequest === symlinkResolver) {
      delete context.resolveRequest;

      // If the module was redirected using the `browser` field, we need to let
      // Metro handle this without interfering.
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
