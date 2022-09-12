import path from "path";
import type { Config as CLIConfig } from "@react-native-community/cli-types";
import type { Reporter } from "metro";
import { loadConfig, ConfigT, InputConfigT } from "metro-config";
import type {
  CustomResolver,
  Resolution,
  ResolutionContext,
} from "metro-resolver";
import { resolve as metroResolver } from "metro-resolver";

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    "/Libraries/Renderer/implementations/.+\\.js$",
    "/Libraries/BatchedBridge/MessageQueue\\.js$",
    "/Libraries/YellowBox/.+\\.js$",
    "/Libraries/LogBox/.+\\.js$",
    "/Libraries/Core/Timers/.+\\.js$",
    "/node_modules/react-devtools-core/.+\\.js$",
    "/node_modules/react-refresh/.+\\.js$",
    "/node_modules/scheduler/.+\\.js$",
  ].join("|")
);

function reactNativePlatformResolver(platformImplementations: {
  [platform: string]: string;
}) {
  const platformResolver = (
    context: ResolutionContext,
    moduleName: string,
    platform: string
  ): Resolution => {
    let resolve: CustomResolver = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (platformResolver === resolveRequest) {
      delete context.resolveRequest;
    } else if (resolveRequest) {
      resolve = resolveRequest;
    }

    try {
      let modifiedModuleName = moduleName;
      const reactNativePlatform = platformImplementations[platform];
      if (reactNativePlatform) {
        if (moduleName === "react-native") {
          modifiedModuleName = reactNativePlatform;
        } else if (moduleName.startsWith("react-native/")) {
          modifiedModuleName = `${reactNativePlatform}/${modifiedModuleName.slice(
            "react-native/".length
          )}`;
        }
      }
      return resolve(context, modifiedModuleName, platform, null);
    } finally {
      if (!context.resolveRequest) {
        context.resolveRequest = resolveRequest;
      }
    }
  };
  return platformResolver;
}

function getAsyncRequireModulePath(): string | undefined {
  try {
    // `metro-runtime` was introduced in 0.63
    return require.resolve("metro-runtime/src/modules/asyncRequire");
  } catch (_) {
    return require.resolve("metro/src/lib/bundle-modules/asyncRequire");
  }
}

function getDefaultConfig(cliConfig: CLIConfig): InputConfigT {
  try {
    const {
      getDefaultConfig,
    } = require("@react-native-community/cli-plugin-metro");
    return getDefaultConfig(cliConfig);
  } catch (_) {
    // Retry with our custom logic
  }

  const outOfTreePlatforms = Object.keys(cliConfig.platforms).filter(
    (platform) => cliConfig.platforms[platform].npmPackageName
  );

  // Create and return an incomplete InputConfigT. It is used as an override
  // to Metro's default configuration. This has to be force-cast because
  // Metro doesn't define a partial version of InputConfigT, nor does its
  // loadConfig() API accept a partial object.
  const defaultConfig: unknown = {
    resolver: {
      resolveRequest:
        outOfTreePlatforms.length === 0
          ? undefined
          : reactNativePlatformResolver(
              outOfTreePlatforms.reduce<{ [platform: string]: string }>(
                (result, platform) => {
                  result[platform] =
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    cliConfig.platforms[platform].npmPackageName!;
                  return result;
                },
                {}
              )
            ),
      resolverMainFields: ["react-native", "browser", "main"],
      platforms: [...Object.keys(cliConfig.platforms), "native"],
    },
    serializer: {
      // We can include multiple copies of InitializeCore here because metro will
      // only add ones that are already part of the bundle
      getModulesRunBeforeMainModule: () => [
        require.resolve(
          path.join(cliConfig.reactNativePath, "Libraries/Core/InitializeCore")
        ),
        ...outOfTreePlatforms.map((platform) =>
          require.resolve(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            `${cliConfig.platforms[platform]
              .npmPackageName!}/Libraries/Core/InitializeCore`
          )
        ),
      ],
      getPolyfills: () =>
        require(path.join(cliConfig.reactNativePath, "rn-get-polyfills"))(),
    },
    server: {
      port: Number(process.env.RCT_METRO_PORT) || 8081,
    },
    symbolicator: {
      customizeFrame: (frame: { file: string | null }) => {
        const collapse = Boolean(
          frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file)
        );
        return { collapse };
      },
    },
    transformer: {
      allowOptionalDependencies: true,
      babelTransformerPath: require.resolve(
        "metro-react-native-babel-transformer"
      ),
      assetRegistryPath: "react-native/Libraries/Image/AssetRegistry",
      asyncRequireModulePath: getAsyncRequireModulePath(),
    },
    watchFolders: [],
  };
  return defaultConfig as InputConfigT;
}

export type MetroConfigOverrides = {
  config?: string;
  port?: number;
  projectRoot?: string;
  watchFolders?: string[];
  sourceExts?: string[];
  maxWorkers?: number;
  resetCache?: boolean;
  reporter?: Reporter;
  assetPlugins?: string[];
};

/**
 * Load the Metro configuration and apply overrides. If a config file isn't given,
 * this loads from one of the default files -- metro.config.hs, metro.config.json,
 * or package.json.
 *
 * @param cliConfig `@react-native-community/cli` configuration
 * @param overrides Overrides to apply to the Metro configuration
 * @returns Overridden Metro configuration
 */
export function loadMetroConfig(
  cliConfig: CLIConfig,
  overrides: MetroConfigOverrides
): Promise<ConfigT> {
  const defaultConfig = getDefaultConfig(cliConfig);

  //  apply overrides that loadConfig() doesn't do for us
  if (overrides.reporter) {
    defaultConfig.reporter = overrides.reporter;
  }
  if (overrides.assetPlugins) {
    // @ts-expect-error We want to assign to read-only `assetPlugins`
    defaultConfig.transformer.assetPlugins = assetPlugins;
  }

  return loadConfig({ cwd: cliConfig.root, ...overrides }, defaultConfig);
}
