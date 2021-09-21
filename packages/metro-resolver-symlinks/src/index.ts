import { normalizePath } from "@rnx-kit/tools-node";
import type { ResolutionContext } from "metro-resolver";
import type { MetroResolver } from "./resolver";
import {
  getMetroResolver,
  remapReactNativeModule,
  resolveModulePath,
} from "./resolver";

type Options = {
  remapModule?: (
    context: ResolutionContext,
    moduleName: string,
    platform: string
  ) => string;
};

function makeResolver({
  remapModule = (_, moduleName, __) => moduleName,
}: Options = {}): MetroResolver {
  const resolve = getMetroResolver();

  // TODO: Read available platforms from `react-native config`.
  const availablePlatforms = {
    macos: "react-native-macos",
    win32: "@office-iss/react-native-win32",
    windows: "react-native-windows",
  };

  return (context, moduleName, platform) => {
    if (!platform) {
      throw new Error("No platform was specified");
    }

    const backupResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    let modifiedModuleName = remapModule(context, moduleName, platform);
    modifiedModuleName = remapReactNativeModule(
      modifiedModuleName,
      platform,
      availablePlatforms
    );
    modifiedModuleName = resolveModulePath(
      modifiedModuleName,
      context.originModulePath
    );
    modifiedModuleName = normalizePath(modifiedModuleName);

    const resolution = resolve(context, modifiedModuleName, platform);

    // Restoring `resolveRequest` must happen last
    context.resolveRequest = backupResolveRequest;

    return resolution;
  };
}

export = makeResolver;
