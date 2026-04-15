import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { loadMetroConfig } from "@rnx-kit/metro-service";
import { reportPerfData, trackPerformance } from "@rnx-kit/tools-performance";
import { commonBundleCommandOptions } from "./bundle/cliOptions.ts";
import { emitBytecode } from "./bundle/hermes.ts";
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
import { asBoolean } from "./helpers/parsers.ts";

type CLIBundleOptions = CLICommonBundleOptions & {
  metafile?: boolean | string;
  treeShake?: boolean;
};

function applyTreeShakingOverrides(
  bundleConfig: CLIPlatformBundleConfig,
  { dev, metafile, minify }: CLIBundleOptions
) {
  if (!dev && bundleConfig.treeShake) {
    const treeShake =
      typeof bundleConfig.treeShake === "object" ? bundleConfig.treeShake : {};
    if (metafile != null) {
      treeShake.metafile =
        typeof metafile === "string"
          ? metafile
          : `${bundleConfig.bundleOutput}.meta.json`;
    }
    if (minify != null) {
      treeShake.minify = minify;
    }
    bundleConfig.treeShake = treeShake;
  } else {
    bundleConfig.treeShake = false;
  }
}

function applyPerformanceSettings({
  perfTrace,
  perfMarks,
  perfFrequency,
  maxWorkers,
}: CLIBundleOptions) {
  if ((perfTrace || perfMarks) && maxWorkers !== 1) {
    console.log(
      "Performance tracing will miss transformations if --max-workers is not set to 1."
    );
  }
  if (perfTrace) {
    trackPerformance({
      enable: true,
      strategy: "timing",
      frequency: perfFrequency ?? "medium",
    });
  } else if (perfMarks) {
    trackPerformance({ strategy: "node", frequency: perfFrequency ?? "low" });
  }
}

export async function rnxBundle(
  _argv: string[],
  cliConfig: CLIConfig,
  cliOptions: CLIBundleOptions
): Promise<void> {
  // apply performance settings first so anything triggered in metro config load will have the settings
  applyPerformanceSettings(cliOptions);

  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const bundleConfigs = getCliPlatformBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );

  const overridableFlags = [
    ...BUNDLE_CONFIG_COMMAND_LINE_OVERRIDES,
    "hermes",
    "treeShake",
  ] as const;

  for (const bundleConfig of bundleConfigs) {
    applyCommandLineOverrides(bundleConfig, cliOptions, overridableFlags);
    applyTreeShakingOverrides(bundleConfig, cliOptions);

    const { dev, minify } = cliOptions;
    await metroBundle(metroConfig, bundleConfig, dev, minify);

    const { bundleOutput, hermes, sourcemapOutput } = bundleConfig;
    if (hermes) {
      emitBytecode(
        cliConfig,
        bundleOutput,
        sourcemapOutput,
        hermes === true ? {} : hermes
      );
    }
  }
  if (cliOptions.perfTrace || cliOptions.perfMarks) {
    reportPerfData();
  }
}

export const rnxBundleCommand = {
  name: "rnx-bundle",
  description: "Bundle your JavaScript for offline use",
  func: rnxBundle,
  options: [
    ...commonBundleCommandOptions,
    {
      name: "--metafile [boolean|string]",
      description:
        "If tree shaking enabled, also produce some metadata about the build in JSON format",
    },
    {
      name: "--tree-shake [boolean]",
      description:
        "Enable tree shaking to remove unused code and reduce the bundle size",
      parse: asBoolean,
    },
  ],
};
