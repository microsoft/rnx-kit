import { resolveDependencyChain } from "@rnx-kit/tools-node/package";
import { resolveCommunityCLI } from "@rnx-kit/tools-react-native/context";
import type { CliServerApi, CoreDevMiddleware } from "../serve/types";

type ExternalModule =
  | "@react-native-community/cli-server-api"
  | "@react-native/dev-middleware";

function friendlyRequire<T>(modules: string[], startDir: string): T {
  try {
    const modulePath = resolveDependencyChain(modules, startDir);
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
  module: "@react-native-community/cli-server-api",
  projectRoot: string,
  reactNativePath: string
): CliServerApi;

export function requireExternal(
  module: "@react-native/dev-middleware",
  projectRoot: string,
  reactNativePath: string
): CoreDevMiddleware;

export function requireExternal(
  module: ExternalModule,
  projectRoot: string,
  reactNativePath: string
): CliServerApi | CoreDevMiddleware {
  switch (module) {
    case "@react-native-community/cli-server-api":
      return friendlyRequire<CliServerApi>(
        [
          "@react-native-community/cli",
          "@react-native-community/cli-server-api",
        ],
        resolveCommunityCLI(projectRoot, reactNativePath)
      );
    case "@react-native/dev-middleware":
      return friendlyRequire<CoreDevMiddleware>(
        ["@react-native/community-cli-plugin", "@react-native/dev-middleware"],
        reactNativePath
      );
  }
}
