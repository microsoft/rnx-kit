import { getKitConfig } from "@rnx-kit/config";
import { createRequire } from "node:module";
import type {
  Deployment,
  DistributionPlugin,
  JSObject,
  PluginInterface,
} from "./types.js";

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
    const require = createRequire(import.meta.url);
    const modulePath = require.resolve(plugin, { paths: [projectRoot] });
    return import(modulePath).then((module) => {
      const plugin: PluginInterface = module.default || module;
      if (!plugin.distribution) {
        throw new Error(`'${plugin}' is not a valid distribution plugin`);
      }
      return plugin.distribution(pluginConfig);
    });
  }

  return import("./distribution/local.js");
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
