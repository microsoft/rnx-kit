import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { resolveDependencyChain } from "@rnx-kit/tools-node/package";
import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { ConfigT, InputConfigT } from "metro-config";
import type {
  CustomResolver,
  Resolution,
  ResolutionContext,
} from "metro-resolver";
import * as path from "path";
import { requireMetroPath } from "./metro";

export type MetroConfigOverrides = {
  config?: string;
  port?: number;
  projectRoot?: string;
  watchFolders?: string[];
  sourceExts?: string[];
  maxWorkers?: number;
  resetCache?: boolean;
  assetPlugins?: string[];
};

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

function reactNativePlatformResolver(
  platformImplementations: Record<string, string>,
  projectRoot: string
) {
  const { resolve: metroResolver } = requireModuleFromMetro(
    "metro-resolver",
    projectRoot
  );

  const platformResolver = (
    context: ResolutionContext,
    moduleName: string,
    platform: string
  ): Resolution => {
    let resolve: CustomResolver = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (platformResolver === resolveRequest) {
      // @ts-expect-error We intentionally delete `resolveRequest` here and restore it later
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
      // @ts-expect-error We pass 4 arguments instead of 3 to be backwards compatible
      return resolve(context, modifiedModuleName, platform, null);
    } finally {
      if (!context.resolveRequest) {
        // @ts-expect-error We intentionally deleted `resolveRequest` and restore it here
        context.resolveRequest = resolveRequest;
      }
    }
  };
  return platformResolver;
}

function getAsyncRequireModulePath(projectRoot: string): string | undefined {
  const paths = { paths: [requireMetroPath(projectRoot)] };
  try {
    // `metro-runtime` was introduced in 0.63
    return require.resolve("metro-runtime/src/modules/asyncRequire", paths);
  } catch (_) {
    return require.resolve("metro/src/lib/bundle-modules/asyncRequire", paths);
  }
}

function getDefaultConfigInternal({
  root,
  platforms,
  reactNativePath,
}: CLIConfig): InputConfigT {
  const options = { paths: [root] };

  const outOfTreePlatforms: [string, string][] = [];
  for (const [platform, { npmPackageName }] of Object.entries(platforms)) {
    if (npmPackageName) {
      outOfTreePlatforms.push([platform, npmPackageName]);
    }
  }

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
              Object.fromEntries(outOfTreePlatforms),
              root
            ),
      resolverMainFields: ["react-native", "browser", "main"],
      platforms: [...Object.keys(platforms), "native"],
    },
    serializer: {
      // We can include multiple copies of InitializeCore here because metro will
      // only add ones that are already part of the bundle
      getModulesRunBeforeMainModule: () => [
        require.resolve(
          path.join(reactNativePath, "Libraries/Core/InitializeCore")
        ),
        ...outOfTreePlatforms.map(([, npmPackageName]) =>
          require.resolve(
            `${npmPackageName}/Libraries/Core/InitializeCore`,
            options
          )
        ),
      ],
      getPolyfills: () =>
        require(path.join(reactNativePath, "rn-get-polyfills"))(),
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
        "metro-react-native-babel-transformer",
        options
      ),
      assetRegistryPath: "react-native/Libraries/Image/AssetRegistry",
      asyncRequireModulePath: getAsyncRequireModulePath(root),
    },
    watchFolders: [],
  };
  return defaultConfig as InputConfigT;
}

function getDefaultConfigProvider(
  projectRoot: string
): typeof getDefaultConfigInternal {
  const options = { paths: [projectRoot] };
  try {
    // Starting with `react-native` 0.72, we need to build a complete Metro
    // config upfront and will no longer need to get a default config here.
    require.resolve("@react-native/metro-config", options);
    return () => ({});
  } catch (_) {
    // Ignore
  }

  try {
    const cliPluginMetro = resolveDependencyChain(
      [
        "react-native",
        "@react-native-community/cli",
        "@react-native-community/cli-plugin-metro",
      ],
      projectRoot
    );
    const { getDefaultConfig } = require(cliPluginMetro);

    // Starting with `react-native` 0.72, we need to build a complete Metro
    // config upfront and will no longer need to get a default config here.
    return getDefaultConfig ? getDefaultConfig : () => ({});
  } catch (_) {
    // Ignore
  }

  return getDefaultConfigInternal;
}

/**
 * Load the Metro configuration and apply overrides. If a config file isn't given,
 * this loads from one of the default files -- metro.config.js, metro.config.json,
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
  const getDefaultConfig = getDefaultConfigProvider(cliConfig.root);
  const defaultConfig = getDefaultConfig(cliConfig);

  if (overrides.assetPlugins) {
    // @ts-expect-error We want to assign to read-only `assetPlugins`
    defaultConfig.transformer.assetPlugins = assetPlugins;
  }

  const { loadConfig } = requireModuleFromMetro("metro-config", cliConfig.root);
  return loadConfig({ cwd: cliConfig.root, ...overrides }, defaultConfig);
}
