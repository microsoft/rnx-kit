import { withPlugins } from "@expo/config-plugins";
import * as fs from "fs/promises";
import { compileModsAsync } from "./plugins/mod-compiler";
import { withInternal } from "./plugins/withInternal";
import type { ProjectInfo } from "./types";

export async function applyConfigPlugins({
  appJsonPath,
  ...info
}: ProjectInfo) {
  if (!appJsonPath) {
    return;
  }

  const content = await fs.readFile(appJsonPath, { encoding: "utf-8" });
  const { plugins, ...config } = JSON.parse(content);
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return;
  }

  return compileModsAsync(
    withPlugins(withInternal(config, info), plugins),
    info
  );
}
