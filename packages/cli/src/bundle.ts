import type { Config as CLIConfig } from "@react-native-community/cli-types";
import type { BundleArgs } from "@rnx-kit/metro-service";
import { loadMetroConfig } from "@rnx-kit/metro-service";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { parsePlatform } from "@rnx-kit/tools-react-native/platform";
import type { TransformProfile } from "metro-babel-transformer";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import { applyBundleConfigOverrides } from "./bundle/overrides";
import { parseBoolean, parseTransformProfile } from "./parsers";

export type CLIBundleOptions = {
  id?: string;
  entryFile?: string;
  platform?: AllPlatforms;
  dev: boolean;
  minify?: boolean;
  bundleOutput?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  bundleFormat?: BundleArgs["bundleFormat"];
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  assetsDest?: string;
  treeShake?: boolean;
  unstableTransformProfile?: TransformProfile;
  resetCache?: boolean;
  config?: string;
};

export async function rnxBundle(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const bundleConfigs = getCliPlatformBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );

  applyBundleConfigOverrides(cliOptions, bundleConfigs);

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(
      metroConfig,
      bundleConfig,
      cliOptions.dev,
      cliOptions.minify
    );
  }

  return Promise.resolve();
}

export const rnxBundleCommand = {
  name: "rnx-bundle",
  description:
    "Bundle your rnx-kit package for offline use. See https://aka.ms/rnx-kit.",
  func: rnxBundle,
  options: [
    {
      name: "--id [id]",
      description:
        "Target bundle definition. This is only needed when the rnx-kit configuration has multiple bundle definitions.",
    },
    {
      name: "--entry-file [path]",
      description:
        "Path to the root JavaScript or TypeScript file, either absolute or relative to the package.",
    },
    {
      name: "--platform [ios|android|windows|win32|macos]",
      description:
        "Target platform. When not given, all platforms in the rnx-kit configuration are bundled.",
      parse: parsePlatform,
    },
    {
      name: "--dev [boolean]",
      description:
        "If false, warnings are disabled and the bundle is minified.",
      default: true,
      parse: parseBoolean,
    },
    {
      name: "--minify [boolean]",
      description:
        "Controls whether or not the bundle is minified. Disabling minification is useful for test builds.",
      parse: parseBoolean,
    },
    {
      name: "--bundle-output [string]",
      description:
        "Path to the output bundle file, either absolute or relative to the package.",
    },
    {
      name: "--bundle-encoding [utf8|utf16le|ascii]",
      description: "Character encoding to use when writing the bundle file.",
      default: "utf8",
    },
    {
      name: "--max-workers [number]",
      description:
        "Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.",
      parse: parseInt,
    },
    {
      name: "--sourcemap-output [string]",
      description:
        "Path where the bundle source map is written, either absolute or relative to the package.",
    },
    {
      name: "--sourcemap-sources-root [string]",
      description:
        "Path to use when relativizing file entries in the bundle source map.",
    },
    {
      name: "--sourcemap-use-absolute-path",
      description: "Report SourceMapURL using its full path",
    },
    {
      name: "--assets-dest [path]",
      description:
        "Path where bundle assets like images are written, either absolute or relative to the package. If not given, assets are ignored.",
    },
    {
      name: "--tree-shake [boolean]",
      description:
        "Enable tree shaking to remove unused code and reduce the bundle size.",
      parse: parseBoolean,
    },
    {
      name: "--unstable-transform-profile [string]",
      description:
        "Experimental, transform JS for a specific JS engine. Currently supported: hermes, hermes-canary, default",
      parse: parseTransformProfile,
    },
    {
      name: "--reset-cache",
      description: "Reset the Metro cache.",
    },
    {
      name: "--config [string]",
      description: "Path to the Metro configuration file.",
    },
  ],
};
