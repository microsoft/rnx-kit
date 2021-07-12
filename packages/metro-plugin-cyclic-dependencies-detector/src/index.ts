import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { Graph, Module, SerializerOptions } from "metro";
import { detectCycles, PluginOptions } from "./detectCycles";

export type { PluginOptions } from "./detectCycles";

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
