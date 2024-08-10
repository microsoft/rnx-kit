// @ts-check

/** @typedef {import("metro-config").MetroConfig} MetroConfig */

/**
 * Determines whether this is an Expo config.
 * @param {MetroConfig=} config
 * @returns {boolean}
 */
function isExpoConfig(config) {
  if (!config) {
    return false;
  }

  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/metro-config/src/ExpoMetroConfig.ts#L256
  const transformer = config.transformer;
  if (transformer) {
    if (
      "_expoRelativeProjectRoot" in transformer ||
      transformer.babelTransformerPath?.includes("@expo")
    ) {
      return true;
    }
  }

  return Boolean(config.transformerPath?.includes("@expo"));
}

/**
 * Applies workarounds to make the Expo config work.
 * @param {MetroConfig} config
 * @param {MetroConfig} defaultConfig
 * @returns {void}
 */
function applyExpoWorkarounds(config, defaultConfig) {
  // Expo's default config is based on Metro's default config, and Metro's
  // default config sets some fields (like `resolveRequest`) to `null`, which
  // then overwrites our fields:
  // https://github.com/facebook/metro/blob/v0.80.10/packages/metro-config/src/defaults/index.js#L51
  if (config.resolver?.resolveRequest === null) {
    delete config.resolver.resolveRequest;
  }

  // Expo _always_ sets `getModulesRunBeforeMainModule`:
  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/metro-config/src/ExpoMetroConfig.ts#L207
  const getModulesRunBeforeMainModule =
    config.serializer?.getModulesRunBeforeMainModule;
  if (getModulesRunBeforeMainModule) {
    const core = /Libraries[/\\]Core[/\\]InitializeCore/;
    const prelude =
      defaultConfig.serializer?.getModulesRunBeforeMainModule?.("") ?? [];
    config.serializer.getModulesRunBeforeMainModule = (entryFilePath) => {
      const modules = prelude.slice();
      for (const m of getModulesRunBeforeMainModule(entryFilePath)) {
        if (!core.test(m)) {
          modules.push(m);
        }
      }
      return modules;
    };
  }
}

exports.applyExpoWorkarounds = applyExpoWorkarounds;
exports.isExpoConfig = isExpoConfig;
