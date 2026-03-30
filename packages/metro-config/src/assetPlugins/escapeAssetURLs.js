/**
 * @typedef {import("metro").AssetData} AssetData;
 */

/**
 * @param {string} str
 * @param {string} searchValue
 * @param {string} replaceValue
 * @returns {string}
 */
function replaceString(str, searchValue, replaceValue) {
  return str.startsWith("/assets/")
    ? str.replaceAll(searchValue, replaceValue)
    : str;
}

/**
 * Metro doesn't support assets in a monorepo setup. When the app requests
 * assets at URLs such as `/assets/../../../node_modules/react-native/<...>`,
 * the URL will be resolved to `/node_modules/react-native/<...>` and Metro will
 * fail to resolve them. The workaround is to replace `..` with something else
 * so the URL doesn't collapse when resolved, then restore them in
 * `server.rewriteRequestUrl`.
 *
 * For more details, see https://github.com/facebook/metro/issues/290.
 *
 * @param {import("type-fest").Writable<AssetData>} assetData
 * @returns {AssetData}
 */
function assetPlugin(assetData) {
  const url = assetData.httpServerLocation;
  assetData.httpServerLocation = replaceString(url, "../", "@@/");
  return assetData;
}

/**
 * Restores `..` in asset URLs.
 * @param {string} url
 * @returns {string}
 */
function restoreAssetURL(url) {
  return replaceString(url, "@@/", "../");
}

module.exports = assetPlugin;
module.exports.restoreAssetURL = restoreAssetURL;
