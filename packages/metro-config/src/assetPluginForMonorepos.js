/**
 * @typedef {import("metro").AssetData} AssetData;
 * @typedef {import("metro-config").ConfigT} ConfigT;
 * @typedef {import("metro-config").Middleware} Middleware;
 *
 * @typedef {import("metro/src/Server") & {
 *   _config?: ConfigT;
 * }} Server;
 */

/**
 * Metro doesn't support assets in a monorepo setup. When the app requests
 * assets at URLs such as `/assets/../../../node_modules/react-native/<...>`,
 * the URL will be resolved to `/node_modules/react-native/<...>` and Metro will
 * fail to resolve them. The workaround is to replace `..` with something else
 * so the URL doesn't collapse when resolved, then restore them in
 * `server.enhanceMiddleware`.
 *
 * For more details, see https://github.com/facebook/metro/issues/290.
 *
 * @param {import("type-fest").Mutable<AssetData>} assetData
 * @returns {AssetData}
 */
function assetPlugin(assetData) {
  assetData.httpServerLocation = assetData.httpServerLocation.replace(
    /\.\.\//g,
    "@@/"
  );
  return assetData;
}

/**
 * Injects {@link assetPlugin} into server asset plugins.
 *
 * This should only be called from {@link enhanceMiddleware} to ensure that the
 * asset plugin is only applied when we are serving. This has the nice
 * side-effect that the plugin doesn't get included if the middleware is
 * unused (during bundling) or removed.
 *
 * @param {Server} server
 */
function injectAssetPlugin(server) {
  const config = server._config;
  if (!config || !Array.isArray(config.transformer.assetPlugins)) {
    console.warn(
      "'@rnx-kit/metro-config' was unable to install the asset plugin for " +
        "monorepos. Please try again with the latest version. If this " +
        "warning still persists, you can file an issue at " +
        "https://github.com/microsoft/rnx-kit/issues/new?assignees=&labels=bug&template=bug_report.yml"
    );
    return;
  }

  config.transformer.assetPlugins.push(__filename);
}

/**
 * This middleware restores `..` in asset URLs.
 *
 * @param {Middleware} middleware
 * @param {Server} server
 * @returns {Middleware}
 */
function enhanceMiddleware(middleware, server) {
  injectAssetPlugin(server);
  return (req, res, next) => {
    const { url } = req;
    if (url && url.startsWith("/assets/")) {
      req.url = url.replace(/@@\//g, "../");
    }
    return middleware(req, res, next);
  };
}

module.exports = assetPlugin;
module.exports.enhanceMiddleware = enhanceMiddleware;
