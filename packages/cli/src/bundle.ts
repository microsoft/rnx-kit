import type { TransformProfile } from "metro-babel-transformer";
import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { BundleArgs, loadMetroConfig } from "@rnx-kit/metro-service";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import { applyBundleConfigOverrides } from "./bundle/overrides";

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
