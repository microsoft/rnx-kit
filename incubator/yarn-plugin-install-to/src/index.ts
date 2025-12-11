import { type Plugin } from "@yarnpkg/core";
import { InstallTo } from "./installTo.ts";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  commands: [InstallTo],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
