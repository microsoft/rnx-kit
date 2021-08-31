import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { BundleArgs, loadMetroConfig } from "@rnx-kit/metro-service";
import { extendObjectArray } from "@rnx-kit/tools-language/properties";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { Service } from "@rnx-kit/typescript-service";
import { getKitBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import { applyKitBundleConfigOverrides } from "./bundle/overrides";
import type { BundleConfig, KitBundleConfig } from "./bundle/types";
const { setMetroRoots } = require("./metro-patch");

export type CLIBundleOptions = {
  id?: string;
  platform?: AllPlatforms;
  entryPath?: string;
  distPath?: string;
  assetsPath?: string;
  bundlePrefix?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  dev: boolean;
  minify?: boolean;
  experimentalTreeShake?: boolean;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  resetCache?: boolean;
  config?: string;
};

export async function rnxBundle(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  // Set Metro's package roots separately from its watch folders.
  // This can be removed after Metro PR https://github.com/facebook/metro/pull/701
  // is merged, published, and updated in our repo.
  //
  // eslint-disable-next-line
  // @ts-ignore
  setMetroRoots(metroConfig.roots);

  const kitBundleConfigs = getKitBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );
  if (!kitBundleConfigs) {
    return Promise.resolve();
  }

  applyKitBundleConfigOverrides(cliOptions, kitBundleConfigs);

  const bundleConfigs = extendObjectArray<KitBundleConfig, BundleConfig>(
    kitBundleConfigs,
    {
      dev: cliOptions.dev,
      minify: cliOptions.minify,
    }
  );

  const tsservice = new Service();

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(tsservice, metroConfig, bundleConfig);
  }

  return Promise.resolve();
}
