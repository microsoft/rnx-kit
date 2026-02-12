import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { CyclicDependencyPluginOptions } from "@rnx-kit/types-bundle-plugin-options";
import { detectCycles } from "./detectCycles.ts";

export { packageRelativePath } from "./detectCycles.ts";

export function CyclicDependencies(
  pluginOptions: CyclicDependencyPluginOptions = {}
): MetroPlugin {
  return (entryPoint, _preModules, graph, _options) => {
    detectCycles(entryPoint, graph, pluginOptions);
  };
}

CyclicDependencies.type = "serializer";

// `export default` required for plugin interface
// eslint-disable-next-line no-restricted-exports
export default CyclicDependencies;
