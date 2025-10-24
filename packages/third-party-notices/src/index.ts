import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { WriteThirdPartyNoticesOptions } from "./types.ts";
import {
  gatherModulesFromSources,
  writeThirdPartyNoticesFromMap,
} from "./write-third-party-notices.ts";

export { writeThirdPartyNoticesCommand } from "./commander.ts";
export { writeThirdPartyNotices } from "./write-third-party-notices.ts";

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
