// @ts-check
const {
  readPackage,
  findPackageDependencyDir,
} = require("@rnx-kit/tools-node/package");
const { findUp } = require("@rnx-kit/tools-node/path");
const { requireModuleFromMetro } = require("@rnx-kit/tools-react-native/metro");

/**
 * @typedef {import("metro-config").MetroConfig} MetroConfig;
 * @typedef {import("metro-resolver").CustomResolver} CustomResolver;
 * @typedef {import("metro-resolver").Resolution} Resolution;
 * @typedef {import("metro-resolver").ResolutionContext} ResolutionContext;
 *
 * @typedef {ReturnType<typeof import("@rnx-kit/tools-react-native").getAvailablePlatforms>} PlatformImplementations;
 */

/**
 * @param {PlatformImplementations} availablePlatforms
 * @param {string} projectRoot
 */
function getPreludeModules(availablePlatforms, projectRoot) {
  // Include all instances of `InitializeCore` here and let Metro exclude
  // the unused ones.
  const requireOptions = { paths: [projectRoot] };
  const mainModules = new Set([
    require.resolve(
      "react-native/Libraries/Core/InitializeCore",
      requireOptions
    ),
  ]);
  for (const moduleName of Object.values(availablePlatforms)) {
    if (moduleName) {
      mainModules.add(
        require.resolve(
          `${moduleName}/Libraries/Core/InitializeCore`,
          requireOptions
        )
      );
    }
  }
  return Array.from(mainModules);
}

/**
 * Returns whether we need to build a complete Metro config.
 *
 * This is a requirement starting with 0.72 as `@react-native-community/cli`
 * will no longer provide defaults.
 *
 * @param {string} projectRoot
 * @returns {boolean}
 */
function needsFullConfig(projectRoot) {
  const options = { startDir: projectRoot };
  const pkgJson = findUp("package.json", options);
  if (!pkgJson) {
    return false;
  }

  const rnDir = findPackageDependencyDir("react-native", options);
  if (!rnDir) {
    return false;
  }

  const { version } = readPackage(rnDir);
  const [major, minor = 0] = version.split(".");
  const v = Number(major) * 1000 + Number(minor);
  return v === 0 || v >= 72;
}

/**
 * @param {string} moduleName
 * @param {string} implementation
 */
function redirectToPlatform(moduleName, implementation) {
  if (implementation) {
    if (moduleName === "react-native") {
      return implementation;
    }

    const prefix = "react-native/";
    if (moduleName.startsWith(prefix)) {
      return `${implementation}/${moduleName.slice(prefix.length)}`;
    }
  }
  return moduleName;
}

/**
 * @param {PlatformImplementations} implementations
 * @param {string} projectRoot
 */
function outOfTreePlatformResolver(implementations, projectRoot) {
  const { resolve: metroResolver } = requireModuleFromMetro(
    "metro-resolver",
    projectRoot
  );

  /** @type {(context: ResolutionContext, moduleName: string, platform: string) => Resolution} */
  const platformResolver = (context, moduleName, platform) => {
    /** @type {CustomResolver} */
    let resolve = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (platformResolver === resolveRequest) {
      // @ts-expect-error We intentionally delete `resolveRequest` here and restore it later
      delete context.resolveRequest;
    } else if (resolveRequest) {
      resolve = resolveRequest;
    }

    try {
      const impl = implementations[platform];
      const modifiedModuleName = redirectToPlatform(moduleName, impl);
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

/**
 * Tries to resolve `@react-native/metro-config` from specified directory.
 * @param {string} fromDir
 * @returns {string}
 */
function resolveMetroConfig(fromDir) {
  const options = { paths: [fromDir] };
  try {
    return require.resolve("@react-native/metro-config", options);
  } catch (_) {
    throw new Error(
      "Cannot find module '@react-native/metro-config'; as of React Native 0.72, it is required for configuring Metro correctly"
    );
  }
}

/**
 * Returns default Metro config.
 *
 * Starting with `react-native` 0.72, we need to build a complete Metro config
 * as `@react-native-community/cli` will no longer provide defaults.
 *
 * @param {string} projectRoot
 * @returns {MetroConfig[]}
 */
function getDefaultConfig(projectRoot) {
  if (!needsFullConfig(projectRoot)) {
    return [];
  }

  const metroConfigPath = resolveMetroConfig(projectRoot);

  const { getDefaultConfig } = require(metroConfigPath);
  const { getAvailablePlatforms } = require("@rnx-kit/tools-react-native");

  const defaultConfig = getDefaultConfig(projectRoot);

  const availablePlatforms = getAvailablePlatforms(projectRoot);
  defaultConfig.resolver.platforms = Object.keys(availablePlatforms);
  defaultConfig.resolver.resolveRequest = outOfTreePlatformResolver(
    availablePlatforms,
    projectRoot
  );

  const preludeModules = getPreludeModules(availablePlatforms, projectRoot);
  defaultConfig.serializer.getModulesRunBeforeMainModule = () => {
    return preludeModules;
  };

  return [defaultConfig];
}

exports.getDefaultConfig = getDefaultConfig;
