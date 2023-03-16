import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { PluginOptions } from "./detectCycles";
import { detectCycles } from "./detectCycles";

export type { PluginOptions } from "./detectCycles";

export function CyclicDependencies(
  pluginOptions: PluginOptions = {}
): MetroPlugin {
  return (entryPoint, _preModules, graph, _options) => {
    detectCycles(entryPoint, graph, pluginOptions);
  };
}

CyclicDependencies.type = "serializer";

export default CyclicDependencies;
