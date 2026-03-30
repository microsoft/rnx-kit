/**
 * @typedef {import("metro").AssetData} AssetData;
 */

/**
 * Metro doesn't support assets in a monorepo setup. When the app requests
 * assets at URLs such as `/assets/../../../node_modules/react-native/<...>`,
 * the URL will be resolved to `/node_modules/react-native/<...>` and Metro will
 * fail to resolve them.
 *
 * In 0.67, they introduced a query parameter, `unstable_path`, specifically to
 * handle such cases. However, this isn't properly fleshed out and only works in
 * server mode. Bundling with this plugin may cause issues with asset paths.
 *
 * For more details, see https://github.com/facebook/metro/issues/290.
 *
 * @param {import("type-fest").Writable<AssetData>} assetData
 * @returns {AssetData}
 */
module.exports = function (assetData) {
  const prefix = "/assets/../";
  const url = assetData.httpServerLocation;
  if (url.startsWith(prefix)) {
    assetData.httpServerLocation = url.replace(
      prefix,
      "/assets?unstable_path=../"
    );
  }
  return assetData;
};
