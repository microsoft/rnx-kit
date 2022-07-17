import { getKitConfig } from "@rnx-kit/config";
import type { Deployment, DistributionPlugin, JSObject } from "./types";

type Plugin = [string, JSObject];

type DraftKitConfig = ReturnType<typeof getKitConfig> & {
  build?: {
    distribution?: Plugin;
  };
};

function loadPlugin(
  deployment: Deployment,
  [plugin, pluginConfig]: Partial<Plugin>,
  projectRoot: string
): Promise<DistributionPlugin> {
  if (deployment === "remote-first" && typeof plugin === "string") {
    const modulePath = require.resolve(plugin, { paths: [projectRoot] });
    return Promise.resolve(require(modulePath)(pluginConfig));
  }

  return import("./distribution/local");
}

export function getDistribution(
  deployment: Deployment,
  projectRoot: string
): Promise<DistributionPlugin> {
  const kitConfig = getKitConfig({ cwd: projectRoot }) as DraftKitConfig;
  const distConfig = kitConfig?.build?.distribution;
  const plugin: Partial<Plugin> = Array.isArray(distConfig) ? distConfig : [];
  return loadPlugin(deployment, plugin, projectRoot);
}
