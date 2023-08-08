// https://github.com/react-native-community/cli/blob/716555851b442a83a1bf5e0db27b6226318c9a69/packages/cli-plugin-metro/src/commands/bundle/buildBundle.ts

import { error, info } from "@rnx-kit/console";
import chalk from "chalk";
import fs from "fs";
import type { ConfigT } from "metro-config";
import type { BundleOptions, OutputOptions } from "metro/shared/types";
import Server from "metro/src/Server";
import Bundle from "metro/src/shared/output/bundle";
import path from "path";
import { saveAssets } from "./asset";
import { ensureBabelConfig } from "./babel";

export type BundleArgs = {
  assetsDest?: string;
  assetCatalogDest?: string;
  entryFile: string;
  resetCache?: boolean;
  resetGlobalCache?: boolean;
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
  verbose?: boolean;
  unstableTransformProfile?: BundleOptions["unstable_transformProfile"];
};

type RequestOptions = {
  entryFile: string;
  sourceMapUrl?: string;
  dev: boolean;
  minify: boolean;
  platform: string;
  unstable_transformProfile?: BundleOptions["unstable_transformProfile"];
};

export async function bundle(
  args: BundleArgs,
  config: ConfigT,
  output = Bundle
): Promise<void> {
  // ensure Metro can find Babel config
  ensureBabelConfig(config);

  if (config.resolver.platforms.indexOf(args.platform) === -1) {
    error(
      `Invalid platform ${
        args.platform ? `"${chalk.bold(args.platform)}" ` : ""
      }selected.`
    );

    info(
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
    const bundle = await output.build(server, requestOpts);

    // Ensure destination directory exists before saving the bundle
    const mkdirOptions = { recursive: true, mode: 0o755 } as const;
    fs.mkdirSync(path.dirname(args.bundleOutput), mkdirOptions);

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
      args.assetCatalogDest
    );
  } finally {
    server.end();
  }
}
