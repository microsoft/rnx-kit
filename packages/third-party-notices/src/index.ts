import { Graph, Module, SerializerOptions } from "metro";
import { WriteThirdPartyNoticesOptions } from "./types";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { writeThirdPartyNotices } from "./write-third-party-notices";

export { writeThirdPartyNotices } from "./write-third-party-notices";
export function ThirdPartyNotices(
  options: WriteThirdPartyNoticesOptions
): MetroPlugin {
  return (
    _entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    _graph: Graph,
    _options: SerializerOptions
  ) => {
    writeThirdPartyNotices(options);
  };
}

ThirdPartyNotices.type = "serializer";

export default ThirdPartyNotices;
