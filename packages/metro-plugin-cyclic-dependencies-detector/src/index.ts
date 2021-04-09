import { detectCycles, PluginOptions } from "./detectCycles";
import type {
  Graph,
  Module,
  MetroPlugin,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";

export function CyclicDependencies(
  pluginOptions: PluginOptions = {}
): MetroPlugin {
  return (
    entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    graph: Graph,
    _options: SerializerOptions
  ) => {
    detectCycles(entryPoint, graph, pluginOptions);
  };
}
