import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { info } from "@rnx-kit/console";
import { loadMetroConfig } from "@rnx-kit/metro-service";
// @ts-expect-error no declaration file for module
import RamBundle from "metro/src/shared/output/RamBundle";
import { commonBundleOptions } from "./bundle/cliOptions";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import {
  applyBundleConfigOverrides,
  overridableBundleOptions,
} from "./bundle/overrides";
import type {
  CLICommonBundleOptions,
  CliPlatformBundleConfig,
} from "./bundle/types";

type CLIRamBundleOptions = CLICommonBundleOptions & {
  indexedRamBundle?: boolean;
};

function disableTreeShaking(configs: CliPlatformBundleConfig[]): void {
  const wasEnabled = configs.reduce((modified, config) => {
    if (config.treeShake) {
      config.treeShake = false;
      return true;
    }
    return modified;
  }, false);
  if (wasEnabled) {
    info(
      "`treeShake` was disabled because it is not compatible with the RAM bundle format"
    );
  }
}

export async function rnxRamBundle(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIRamBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const bundleConfigs = getCliPlatformBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );

  applyBundleConfigOverrides(cliOptions, bundleConfigs, [
    ...overridableBundleOptions,
    "indexedRamBundle",
  ]);

  disableTreeShaking(bundleConfigs);

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(
      metroConfig,
      bundleConfig,
      cliOptions.dev,
      cliOptions.minify,
      RamBundle
    );
  }
}

export const rnxRamBundleCommand = {
  name: "rnx-ram-bundle",
  description:
    "Bundle your rnx-kit package in the RAM bundle format for offline use. See https://aka.ms/rnx-kit.",
  func: rnxRamBundle,
  options: [
    ...commonBundleOptions,
    {
      name: "--indexed-ram-bundle",
      description:
        'Force the "Indexed RAM" bundle file format, even when targeting Android.',
    },
  ],
};
