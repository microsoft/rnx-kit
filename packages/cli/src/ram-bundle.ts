import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { info } from "@rnx-kit/console";
import { loadMetroConfig, ramBundle } from "@rnx-kit/metro-service";
import { commonBundleCommandOptions } from "./bundle/cliOptions.ts";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config.ts";
import { metroBundle } from "./bundle/metro.ts";
import {
  BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES,
  applyCommandLineOverrides,
} from "./bundle/overrides.ts";
import type {
  CLICommonBundleOptions,
  CLIPlatformBundleConfig,
} from "./bundle/types.ts";

type CLIRamBundleOptions = CLICommonBundleOptions & {
  indexedRamBundle?: boolean;
};

function disableTreeShaking(config: CLIPlatformBundleConfig): void {
  if (config.treeShake) {
    config.treeShake = false;
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

  const overridableFlags = [
    ...BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES,
    "indexedRamBundle",
  ] as const;

  for (const bundleConfig of bundleConfigs) {
    applyCommandLineOverrides(bundleConfig, cliOptions, overridableFlags);
    disableTreeShaking(bundleConfig);

    const { dev, minify } = cliOptions;
    await metroBundle(metroConfig, bundleConfig, dev, minify, ramBundle);
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
