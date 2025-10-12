import { type Plugin } from "@yarnpkg/core";
import { Download } from "./download";
import { InstallTo } from "./installTo";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  commands: [InstallTo, Download],
};

// eslint-disable-next-line no-restricted-exports
export default plugin;
