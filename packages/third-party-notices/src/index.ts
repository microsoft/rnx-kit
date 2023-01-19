import type { Graph, Module, SerializerOptions } from "metro";
import type { WriteThirdPartyNoticesOptions } from "./types";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import {
  gatherModulesFromSources,
  writeThirdPartyNoticesFromMap,
} from "./write-third-party-notices";

export { writeThirdPartyNotices } from "./write-third-party-notices";

export function ThirdPartyNotices(
  options: WriteThirdPartyNoticesOptions
): MetroPlugin {
  return (
    _entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    graph: Graph,
    serializerOptions: SerializerOptions
  ) => {
    if (serializerOptions.dev) {
      return;
    }

    options = {
      rootPath: serializerOptions.projectRoot,
      sourceMapFile: serializerOptions.sourceMapUrl || "",
      json: false,
      ...(options as object),
    };

    const sources = Array.from(graph.dependencies.keys());
    const moduleNameToPath = gatherModulesFromSources(sources, options);
    writeThirdPartyNoticesFromMap(options, moduleNameToPath);
  };
}

ThirdPartyNotices.type = "serializer";

export default ThirdPartyNotices;
