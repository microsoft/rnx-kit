import type { Config as CLIConfig } from "@react-native-community/cli-types";
import type { CLIBundleOptions } from "./bundle";
import { rnxBundle, rnxBundleCommand } from "./bundle";

type CLIRamBundleOptions = Omit<CLIBundleOptions, "bundleFormat">;

export async function rnxRamBundle(
  argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIRamBundleOptions
): Promise<void> {
  return rnxBundle(argv, cliConfig, {
    ...cliOptions,
    bundleFormat: "ram-bundle",
  });
}

export const rnxRamBundleCommand = {
  name: "rnx-ram-bundle",
  description:
    "Bundle your rnx-kit package in the RAM bundle format for offline use. See https://aka.ms/rnx-kit.",
  func: rnxRamBundle,
  options: rnxBundleCommand.options,
};
