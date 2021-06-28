import path from "path";
import chalk from "chalk";

import type { AssetData, OutputOptions } from "metro";
import type { TransformProfile } from "metro-babel-transformer";
import type { ConfigT } from "metro-config";
import Server from "metro/src/Server";
import Bundle from "metro/src/shared/output/bundle";

import { saveAssets } from "./asset";

export interface BundleArgs {
  assetsDest?: string;
  entryFile: string;
  resetCache: boolean;
  transformer?: string;
  minify?: boolean;
  config?: string;
  platform: string;
  dev: boolean;
  bundleOutput: string;
  bundleEncoding?: OutputOptions["bundleEncoding"];
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath: boolean;
  verbose: boolean;
  unstableTransformProfile?: TransformProfile;
}

interface RequestOptions {
  entryFile: string;
  sourceMapUrl?: string;
  dev: boolean;
  minify: boolean;
  platform: string;
  unstable_transformProfile?: TransformProfile;
}

export async function bundle(args: BundleArgs, config: ConfigT): Promise<void> {
  if (config.resolver.platforms.indexOf(args.platform) === -1) {
    console.error(
      `Invalid platform ${
        args.platform ? `"${chalk.bold(args.platform)}" ` : ""
      }selected.`
    );

    console.info(
      `Available platforms are: ${config.resolver.platforms
        .map((x) => `"${chalk.bold(x)}"`)
        .join(
          ", "
        )}. If you are trying to bundle for an out-of-tree platform, it may not be installed.`
    );

    throw new Error("Bundling failed");
  }

  // This is used by a bazillion of npm modules we don't control so we don't
  // have other choice than defining it as an env variable here.
  process.env.NODE_ENV = args.dev ? "development" : "production";

  let sourceMapUrl = args.sourcemapOutput;
  if (sourceMapUrl && !args.sourcemapUseAbsolutePath) {
    sourceMapUrl = path.basename(sourceMapUrl);
  }

  const requestOpts: RequestOptions = {
    entryFile: args.entryFile,
    sourceMapUrl,
    dev: args.dev,
    minify: args.minify !== undefined ? args.minify : !args.dev,
    platform: args.platform,
    unstable_transformProfile: args.unstableTransformProfile,
  };
  const server = new Server(config);

  try {
    const bundle = await Bundle.build(server, requestOpts);

    await Bundle.save(bundle, args, console.info);

    // Save the assets of the bundle
    const outputAssets: readonly AssetData[] = await server.getAssets({
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      ...requestOpts,
      bundleType: "todo",
    });

    // When we're done saving bundle output and the assets, we're done.
    return await saveAssets(outputAssets, args.platform, args.assetsDest);
  } finally {
    server.end();
  }
}
