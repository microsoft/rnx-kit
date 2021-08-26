/**
 * Metro doesn't support assets in a monorepo setup. When the app requests
 * assets at URLs such as `/assets/../../../node_modules/react-native/<...>`,
 * the URL will be resolved to `/node_modules/react-native/<...>` and Metro will
 * fail to resolve them. The workaround is to replace `..` with something else
 * so the URL doesn't collapse when resolved, then restore them in
 * `server.enhanceMiddleware`.
 *
 * For more details, see https://github.com/facebook/metro/issues/290.
 */

/**
 * @template T
 * @typedef {{-readonly [P in keyof T]: T[P]}} Mutable;
 */

/**
 * @typedef {import("metro").AssetData} AssetData;
 * @type {(assetData: Mutable<AssetData>) => AssetData};
 */
module.exports = (assetData) => {
  assetData.httpServerLocation = assetData.httpServerLocation.replace(
    /\.\.\//g,
    "@@/"
  );
  return assetData;
};
