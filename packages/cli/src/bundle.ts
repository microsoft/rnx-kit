import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { loadMetroConfig } from "@rnx-kit/metro-service";
import { commonBundleCommandOptions } from "./bundle/cliOptions";
import { emitBytecode } from "./bundle/hermes";
import { getCliPlatformBundleConfigs } from "./bundle/kit-config";
import { metroBundle } from "./bundle/metro";
import {
  applyBundleConfigOverrides,
  overridableCommonBundleOptions,
} from "./bundle/overrides";
import type { CLICommonBundleOptions } from "./bundle/types";
import { parseBoolean } from "./parsers";

type CLIBundleOptions = CLICommonBundleOptions & {
  treeShake?: boolean;
};

export async function rnxBundle(
  _argv: string[],
  cliConfig: CLIConfig,
  cliOptions: CLIBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const bundleConfigs = getCliPlatformBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );

  applyBundleConfigOverrides(cliOptions, bundleConfigs, [
    ...overridableCommonBundleOptions,
    "hermes",
    "treeShake",
  ]);

  for (const bundleConfig of bundleConfigs) {
    await metroBundle(
      metroConfig,
      bundleConfig,
      cliOptions.dev,
      cliOptions.minify
    );

    const { bundleOutput, hermes, sourcemapOutput } = bundleConfig;
    if (hermes) {
      emitBytecode(
        bundleOutput,
        sourcemapOutput,
        hermes === true ? {} : hermes
      );
    }
  }
}

export const rnxBundleCommand = {
  name: "rnx-bundle",
  description:
    "Bundle your rnx-kit package for offline use. See https://aka.ms/rnx-kit.",
  func: rnxBundle,
  options: [
    ...commonBundleCommandOptions,
    {
      name: "--tree-shake [boolean]",
      description:
        "Enable tree shaking to remove unused code and reduce the bundle size.",
      parse: parseBoolean,
    },
  ],
};
