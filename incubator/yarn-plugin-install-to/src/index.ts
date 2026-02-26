import { type Plugin } from "@yarnpkg/core";
import { InstallTo } from "./installTo.ts";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  commands: [InstallTo],
};

// oxlint-disable-next-line no-default-export
export default plugin;
