import { info } from "@rnx-kit/console";
import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { ConfigT } from "metro-config";
import { getSaveAssetsPlugin } from "../asset/saveAssets";
import { saveAssets } from "../asset/write";
import type { BundleArgs, RequestOptions } from "../types";

// Source: https://github.com/facebook/react-native/blob/0.80-stable/packages/community-cli-plugin/src/commands/bundle/buildBundle.js#L113
export async function buildBundle(
  args: BundleArgs,
  config: ConfigT,
  output: typeof import("metro/src/shared/output/bundle"),
  requestOpts: RequestOptions
): Promise<void> {
  const Server = requireModuleFromMetro("metro/src/Server", config.projectRoot);
  const server = new Server(config);

  try {
    const bundle = await output.build(server, requestOpts);

    await output.save(bundle, args, info);

    // Save the assets of the bundle
    const outputAssets = await server.getAssets({
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      ...requestOpts,
      bundleType: "todo",
    });

    // When we're done saving bundle output and the assets, we're done.
    return await saveAssets(
      outputAssets,
      args.platform,
      args.assetsDest,
      args.assetCatalogDest,
      getSaveAssetsPlugin(args.platform, config.projectRoot)
    );
  } finally {
    server.end();
  }
}
