// Source: https://github.com/facebook/react-native/blob/0.80-stable/packages/community-cli-plugin/src/commands/bundle/buildBundle.js#L64

import { bold, error, info } from "@rnx-kit/console";
import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { ConfigT } from "metro-config";
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureBabelConfig } from "./babel";
import type { BundleArgs } from "./types";

export function bundle(
  args: BundleArgs,
  config: ConfigT,
  output = requireModuleFromMetro(
    "metro/src/shared/output/bundle",
    config.projectRoot
  )
): Promise<void> {
  // ensure Metro can find Babel config
  ensureBabelConfig(config);

  if (config.resolver.platforms.indexOf(args.platform) === -1) {
    error(
      `Invalid platform ${
        args.platform ? `"${bold(args.platform)}" ` : ""
      }selected.`
    );

    info(
      `Available platforms are: ${config.resolver.platforms
        .map((x) => `"${bold(x)}"`)
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

  // Ensure destination directory exists before bundling
  const mkdirOptions = { recursive: true, mode: 0o755 } as const;
  fs.mkdirSync(path.dirname(args.bundleOutput), mkdirOptions);

  // `runMetro` was introduced in 0.71:
  // https://github.com/facebook/metro/commit/a0f99e136fbd2e02ab070437cee9f6e9baa36d16
  const { runMetro } = requireModuleFromMetro("metro", config.projectRoot);
  if (!runMetro) {
    return import("./bundle/bundle-0.66").then(({ buildBundle }) =>
      buildBundle(args, config, output, {
        entryFile: args.entryFile,
        sourceMapUrl,
        dev: args.dev,
        minify: args.minify != null ? args.minify : !args.dev,
        platform: args.platform,
        unstable_transformProfile: args.unstableTransformProfile,
      })
    );
  }

  return import("./bundle/bundle-0.71").then(({ buildBundle }) => {
    const sourceMap = args.sourcemapOutput != null;
    return buildBundle(args, config, output, {
      dev: args.dev,
      entryFile: args.entryFile,
      // @ts-expect-error `inlineSourceMap` was introduced in 0.82
      inlineSourceMap: sourceMap && !sourceMapUrl,
      minify: args.minify != null ? args.minify : !args.dev,
      platform: args.platform,
      sourceMapUrl: !sourceMap ? undefined : sourceMapUrl,
      createModuleIdFactory: config.serializer.createModuleIdFactory,
      unstable_transformProfile: args.unstableTransformProfile,
    });
  });
}
