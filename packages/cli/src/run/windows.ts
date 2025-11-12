import type { Config } from "@react-native-community/cli-types";
import ora from "ora";
import type { WindowsInputParams } from "../build/types.ts";
import type { BuildResult } from "../build/windows.ts";
import { buildWindows } from "../build/windows.ts";

export function runWindows(
  config: Config,
  params: WindowsInputParams,
  additionalArgs: string[],
  logger = ora()
): Promise<BuildResult> {
  const runParams = { ...params, launch: true, deploy: true };
  return buildWindows(config, runParams, additionalArgs, logger);
}
