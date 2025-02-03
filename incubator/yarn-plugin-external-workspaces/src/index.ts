import {
  ConfigurationDefinitionMap,
  Plugin,
  SettingsType,
} from "@yarnpkg/core";
import { CONFIG_DEFAULT, CONFIG_KEY } from "./constants";
import { ExternalResolver } from "./resolver";

/**
 * The plugin definition.
 */
const plugin: Plugin = {
  /**
   * Add a new configurable setting in yarn's configuration.
   */
  configuration: {
    [CONFIG_KEY as keyof ConfigurationDefinitionMap]: {
      description: `Path to the external dependencies provider, either './filename.json/key1/key2' or './src/lookup.js|.cjs' `,
      type: SettingsType.STRING,
      default: CONFIG_DEFAULT,
    },
  },

  /**
   * Hook up the custom resolver
   */
  resolvers: [ExternalResolver],
};

export default plugin;
