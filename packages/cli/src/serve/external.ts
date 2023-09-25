import { resolveDependencyChain } from "@rnx-kit/tools-node/package";
import type { CliServerApi, CoreDevMiddleware } from "./types";

type CliClean = typeof import("@react-native-community/cli-clean");

type ExternalModule =
  | "@react-native-community/cli-clean"
  | "@react-native-community/cli-server-api"
  | "@react-native/dev-middleware";

function friendlyRequire<T>(...modules: string[]): T {
  try {
    const modulePath = resolveDependencyChain(modules);
    return require(modulePath) as T;
  } catch (_) {
    const module = modules[modules.length - 1];
    throw new Error(
      `Cannot find module '${module}'. This probably means that ` +
        "'@rnx-kit/cli' is not compatible with the version of 'react-native' " +
        "that you are currently using. Please update to the latest version " +
        "and try again. If the issue still persists after the update, please " +
        "file a bug at https://github.com/microsoft/rnx-kit/issues."
    );
  }
}

export function requireExternal(
  module: "@react-native-community/cli-clean"
): CliClean;

export function requireExternal(
  module: "@react-native-community/cli-server-api"
): CliServerApi;

export function requireExternal(
  module: "@react-native/dev-middleware"
): CoreDevMiddleware;

export function requireExternal(
  module: ExternalModule
): CliClean | CliServerApi | CoreDevMiddleware {
  switch (module) {
    case "@react-native-community/cli-clean":
      return friendlyRequire<CliClean>(
        "react-native",
        "@react-native-community/cli",
        "@react-native-community/cli-clean"
      );
    case "@react-native-community/cli-server-api":
      return friendlyRequire<CliServerApi>(
        "react-native",
        "@react-native-community/cli",
        "@react-native-community/cli-server-api"
      );
    case "@react-native/dev-middleware":
      return friendlyRequire<CoreDevMiddleware>(
        "react-native",
        "@react-native/community-cli-plugin",
        "@react-native/dev-middleware"
      );
  }
}
