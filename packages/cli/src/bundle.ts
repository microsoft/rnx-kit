import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { BundleArgs, loadMetroConfig } from "@rnx-kit/metro-service";
import { extendObjectArray } from "@rnx-kit/tools-language/properties";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { getKitBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import { applyKitBundleConfigOverrides } from "./bundle/overrides";
import type { BundleConfig, KitBundleConfig } from "./bundle/types";

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

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(metroConfig, bundleConfig);
  }

  return Promise.resolve();
}
