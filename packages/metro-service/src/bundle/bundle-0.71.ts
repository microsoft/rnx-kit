import { warn } from "@rnx-kit/console";
import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { ConfigT } from "metro-config";
import { getSaveAssetsPlugin } from "../asset/saveAssets";
import { saveAssets } from "../asset/write";
import type { BundleArgs, RequestOptions } from "../types";

// Source: https://github.com/facebook/metro/blob/v0.82.4/packages/metro/src/index.flow.js#L386
export async function buildBundle(
  args: BundleArgs,
  config: ConfigT,
  output: typeof import("metro/src/shared/output/bundle"),
  requestOptions: RequestOptions
): Promise<void> {
  const { runMetro } = requireModuleFromMetro("metro", config.projectRoot);
  const metroServer = await runMetro(config, { watch: false });

  try {
    const metroBundle = await output.build(metroServer, requestOptions);

    const bundleOutput = args.bundleOutput;
    if (bundleOutput) {
      const { dev, platform, sourcemapOutput } = args;
      const outputOptions = { bundleOutput, sourcemapOutput, dev, platform };
      await output.save(metroBundle, outputOptions, (message) =>
        config.reporter.update({
          // @ts-expect-error `bundle_save_log` was introduced in 0.82
          type: "bundle_save_log",
          message,
        })
      );
    }

    if (!args.assetsDest) {
      warn("Assets destination folder is not set, skipping...");
      return;
    }

    const MetroServer = requireModuleFromMetro(
      "metro/src/Server",
      config.projectRoot
    );

    const assets = await metroServer.getAssets({
      ...MetroServer.DEFAULT_BUNDLE_OPTIONS,
      ...requestOptions,
    });

    // When we're done saving bundle output and the assets, we're done.
    await saveAssets(
      assets,
      args.platform,
      args.assetsDest,
      args.assetCatalogDest,
      getSaveAssetsPlugin(args.platform, config.projectRoot)
    );
  } finally {
    metroServer.end();
  }
}
