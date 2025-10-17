import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { PluginOptions } from "./detectCycles.ts";
import { detectCycles } from "./detectCycles.ts";

export { packageRelativePath } from "./detectCycles.ts";
export type { PluginOptions } from "./detectCycles.ts";

export function CyclicDependencies(
  pluginOptions: PluginOptions = {}
): MetroPlugin {
  return (entryPoint, _preModules, graph, _options) => {
    detectCycles(entryPoint, graph, pluginOptions);
  };
}

CyclicDependencies.type = "serializer";

// `export default` required for plugin interface
// eslint-disable-next-line no-restricted-exports
export default CyclicDependencies;
