import { findCommunityCliPluginPath } from "@rnx-kit/tools-react-native/cli";
import * as path from "node:path";
import { saveAssetsAndroid } from "./android";
import { saveAssetsDefault } from "./default";
import { saveAssetsIOS } from "./ios";
import type { SaveAssetsPlugin } from "./types";

// Eventually this will be part of the rn config, but we require it on older rn
// versions for win32 and the cli doesn't allow extra config properties.
// See https://github.com/react-native-community/cli/pull/2002
export function getSaveAssetsPlugin(
  platform: string,
  projectRoot: string
): SaveAssetsPlugin {
  if (platform === "win32") {
    try {
      const saveAssetsPlugin = require.resolve(
        "@office-iss/react-native-win32/saveAssetPlugin",
        { paths: [projectRoot] }
      );
      return require(saveAssetsPlugin);
    } catch (_) {
      /* empty */
    }
  }

  // Use `@react-native/community-cli-plugin` when possible
  const pluginPath = findCommunityCliPluginPath(projectRoot);
  if (pluginPath) {
    const { default: saveAssets } = require(
      path.join(pluginPath, "dist", "commands", "bundle", "saveAssets.js")
    );
    return saveAssets;
  }

  switch (platform) {
    case "ios":
      return saveAssetsIOS;
    case "android":
      return saveAssetsAndroid;
    default:
      return saveAssetsDefault;
  }
}
