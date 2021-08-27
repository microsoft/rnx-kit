/**
 * @typedef {import("metro").AssetData} AssetData;
 * @typedef {import("metro-config").Middleware} Middleware;
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
 * This middleware restores `..` in asset URLs.
 *
 * @param {Middleware} middleware
 * @returns {Middleware}
 */
function enhanceMiddleware(middleware) {
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
