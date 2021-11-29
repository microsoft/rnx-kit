import { normalizePath } from "@rnx-kit/tools-node";
import {
  getMetroResolver,
  remapReactNativeModule,
  resolveModulePath,
} from "./resolver";
import type { MetroResolver, Options } from "./types";

function makeResolver({
  remapModule = (_, moduleName, __) => moduleName,
}: Options = {}): MetroResolver {
  const resolve = getMetroResolver();
  const resolvers = [remapModule, remapReactNativeModule, resolveModulePath];

  return (context, moduleName, platform) => {
    if (!platform) {
      throw new Error("No platform was specified");
    }

    const backupResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    const modifiedModuleName = resolvers.reduce(
      (modifiedName, remap) => remap(context, modifiedName, platform),
      moduleName
    );

    const resolution = resolve(
      context,
      normalizePath(modifiedModuleName),
      platform
    );

    // Restoring `resolveRequest` must happen last
    context.resolveRequest = backupResolveRequest;

    return resolution;
  };
}

export = makeResolver;
