import path from "path";
import type { Config as CLIConfig } from "@react-native-community/cli-types";
import type { Reporter } from "metro";
import { loadConfig, ConfigT, InputConfigT } from "metro-config";
import { resolve, Resolution } from "metro-resolver";

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
  return (
    context: any, // eslint-disable-line
    _realModuleName: string,
    platform: string,
    moduleName: string
  ): Resolution => {
    const backupResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    try {
      let modifiedModuleName = moduleName;
      if (platformImplementations[platform]) {
        if (moduleName === "react-native") {
          modifiedModuleName = platformImplementations[platform];
        } else if (moduleName.startsWith("react-native/")) {
          modifiedModuleName = `${
            platformImplementations[platform]
          }/${modifiedModuleName.slice("react-native/".length)}`;
        }
      }
      const result = resolve(context, modifiedModuleName, platform);
      return result;
    } finally {
      context.resolveRequest = backupResolveRequest;
    }
  };
}

function getDefaultConfig(cliConfig: CLIConfig): InputConfigT {
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
      asyncRequireModulePath: require.resolve(
        "metro-runtime/src/modules/asyncRequire"
      ),
    },
    watchFolders: [],
  };
  return defaultConfig as InputConfigT;
}

//  Load the Metro configuration, overriding specfic props (if given).
//  If a config file isn't given, this loads from one of the default
//  files -- metro.config.js, metro.config.json, or package.json.
export function loadMetroConfig(
  cliConfig: CLIConfig,
  overrides: {
    config?: string;
    maxWorkers?: number;
    resetCache?: boolean;
    reporter?: Reporter;
  }
): Promise<ConfigT> {
  const defaultConfig = getDefaultConfig(cliConfig);
  if (overrides.reporter) {
    defaultConfig.reporter = overrides.reporter;
  }
  return loadConfig(
    {
      cwd: cliConfig.root,
      ...overrides,
    },
    defaultConfig
  );
}
