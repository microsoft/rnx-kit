import type { ConfigPlugin } from "@expo/config-plugins";
import type { ProjectInfo } from "../types";

type Internals = Omit<ProjectInfo, "appJsonPath">;

export const withInternal: ConfigPlugin<Internals> = (config, internals) => {
  config._internal = {
    isDebug: false,
    ...config._internal,
    ...internals,
  };
  return config;
};
