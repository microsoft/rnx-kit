import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { WriteThirdPartyNoticesOptions } from "./types";
import {
  gatherModulesFromSources,
  writeThirdPartyNoticesFromMap,
} from "./write-third-party-notices";

export { writeThirdPartyNotices } from "./write-third-party-notices";

export function ThirdPartyNotices(
  inputOptions: Partial<WriteThirdPartyNoticesOptions>
): MetroPlugin {
  return (_entryPoint, _preModules, graph, serializerOptions) => {
    if (serializerOptions.dev) {
      return;
    }

    const options = {
      rootPath: serializerOptions.projectRoot,
      sourceMapFile: serializerOptions.sourceMapUrl || "",
      json: false,
      ...inputOptions,
    };

    const sources = Array.from(graph.dependencies.keys());
    const moduleNameToPath = gatherModulesFromSources(sources, options);
    writeThirdPartyNoticesFromMap(options, moduleNameToPath);
  };
}

ThirdPartyNotices.type = "serializer";

// `export default` required for plugin interface
// eslint-disable-next-line no-restricted-exports
export default ThirdPartyNotices;
