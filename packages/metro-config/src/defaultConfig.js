// @ts-check
const fs = require("fs");
const path = require("path");

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
 */
function getPreludeModules(availablePlatforms) {
  // Include all instances of `InitializeCore` here and let Metro exclude
  // the unused ones.
  const mainModules = new Set([
    require.resolve("react-native/Libraries/Core/InitializeCore"),
  ]);
  for (const moduleName of Object.values(availablePlatforms)) {
    if (moduleName) {
      mainModules.add(
        require.resolve(`${moduleName}/Libraries/Core/InitializeCore`)
      );
    }
  }
  return Array.from(mainModules);
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
 */
function outOfTreePlatformResolver(implementations) {
  /** @type {(context: ResolutionContext, moduleName: string, platform: string) => Resolution} */
  const platformResolver = (context, moduleName, platform) => {
    const { resolve: metroResolver } = require("metro-resolver");

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
 * Returns default Metro config.
 *
 * Starting with `react-native` 0.72, we need to build a complete Metro config
 * as `@react-native-community/cli` will no longer provide defaults.
 *
 * @param {string} projectRoot
 * @returns {MetroConfig[]}
 */
function getDefaultConfig(projectRoot) {
  try {
    const pkgJson = path.join(projectRoot, "package.json");
    const manifest = fs.readFileSync(pkgJson, { encoding: "utf-8" });
    if (manifest.includes("@react-native/metro-config")) {
      // @ts-ignore Cannot find module or its corresponding type declarations.
      const { getDefaultConfig } = require("@react-native/metro-config");
      const { getAvailablePlatforms } = require("@rnx-kit/tools-react-native");

      const defaultConfig = getDefaultConfig(projectRoot);

      const availablePlatforms = getAvailablePlatforms(projectRoot);
      defaultConfig.resolver.platforms = Object.keys(availablePlatforms);
      defaultConfig.resolver.resolveRequest =
        outOfTreePlatformResolver(availablePlatforms);

      const preludeModules = getPreludeModules(availablePlatforms);
      defaultConfig.serializer.getModulesRunBeforeMainModule = () => {
        return preludeModules;
      };

      return [defaultConfig];
    }
  } catch (_) {
    // Ignore
  }
  return [];
}

exports.getDefaultConfig = getDefaultConfig;
