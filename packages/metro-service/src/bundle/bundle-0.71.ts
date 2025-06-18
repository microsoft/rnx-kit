import { warn } from "@rnx-kit/console";
import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { AssetData } from "metro";
import type { ConfigT } from "metro-config";
import type Server from "metro/src/Server";
import { getSaveAssetsPlugin } from "../asset/saveAssets";
import { saveAssets } from "../asset/write";
import type { BundleArgs, RequestOptions } from "../types";

type MetroBundle = typeof import("metro/src/shared/output/bundle");

type BuildOutput = Awaited<ReturnType<MetroBundle["build"]>>;

type BuildOutputWithAssets = BuildOutput & {
  assets?: readonly AssetData[];
};

/**
 * Adds the `assets` property to the `BuildOutput` type.
 * @see {@link https://github.com/facebook/metro/pull/1511}
 */
function withAssets(bundle: BuildOutput): BuildOutputWithAssets {
  return bundle as unknown as BuildOutputWithAssets;
}

function getAssets(
  metroServer: Server,
  projectRoot: string,
  requestOptions: RequestOptions
): Promise<readonly AssetData[]> {
  const MetroServer = requireModuleFromMetro("metro/src/Server", projectRoot);
  return metroServer.getAssets({
    ...MetroServer.DEFAULT_BUNDLE_OPTIONS,
    ...requestOptions,
  });
}

// Source: https://github.com/facebook/metro/blob/v0.82.4/packages/metro/src/index.flow.js#L386
export async function buildBundle(
  args: BundleArgs,
  config: ConfigT,
  output: MetroBundle,
  requestOptions: RequestOptions
): Promise<void> {
  const { runMetro } = requireModuleFromMetro("metro", config.projectRoot);
  const metroServer = await runMetro(config, { watch: false });

  try {
    // @ts-expect-error Build options was introduced in 0.82
    const metroBundle = await output.build(metroServer, requestOptions, {
      withAssets: Boolean(args.assetsDest),
    });

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

    const assets =
      withAssets(metroBundle).assets ??
      (await getAssets(metroServer, config.projectRoot, requestOptions));

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
