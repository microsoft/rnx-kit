import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { info } from "@rnx-kit/console";
import { loadMetroConfig, ramBundle } from "@rnx-kit/metro-service";
import { commonBundleCommandOptions } from "./bundle/cliOptions.ts";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config.ts";
import { metroBundle } from "./bundle/metro.ts";
import {
  applyBundleConfigOverrides,
  overridableCommonBundleOptions,
} from "./bundle/overrides.ts";
import type {
  CLICommonBundleOptions,
  CliPlatformBundleConfig,
} from "./bundle/types.ts";

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
  _argv: string[],
  cliConfig: CLIConfig,
  cliOptions: CLIRamBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const bundleConfigs = getCliPlatformBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );

  applyBundleConfigOverrides(cliOptions, bundleConfigs, [
    ...overridableCommonBundleOptions,
    "indexedRamBundle",
  ]);

  disableTreeShaking(bundleConfigs);

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(
      metroConfig,
      bundleConfig,
      cliOptions.dev,
      cliOptions.minify,
      ramBundle
    );
  }
}

export const rnxRamBundleCommand = {
  name: "rnx-ram-bundle",
  description:
    "[Deprecated] Bundle your JavaScript in the RAM bundle format for offline use",
  func: rnxRamBundle,
  options: [
    ...commonBundleCommandOptions,
    {
      name: "--indexed-ram-bundle",
      description:
        'Force the "Indexed RAM" bundle file format, even when targeting Android',
    },
  ],
};
