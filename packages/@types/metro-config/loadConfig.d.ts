import type { YargArguments, InputConfigT, ConfigT } from "metro-config";

export function loadConfig(
  argv?: YargArguments = {},
  defaultConfigOverrides?: InputConfigT = {}
): Promise<ConfigT>;
