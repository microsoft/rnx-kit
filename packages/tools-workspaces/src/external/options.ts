import type { ConfigurationOptions } from "./types";

/**
 * Settings for the plugin, used to both load from the configuration and configure the plugin
 */
const configSettings: ConfigurationOptions = {
  configPath: {
    configKey: "externalWorkspacesConfig",
    description: `Path to the external dependencies provider, either './filename.json/key1/key2' or './src/lookup.js|.cjs' `,
    settingType: "string",
    defaultValue: "./package.json/external-workspaces",
  },
  enableLogging: {
    configKey: "externalWorkspacesEnableLogging",
    description: `Turn on debug logging and log output to plugin-external-workspaces.log`,
    settingType: "boolean",
    defaultValue: false,
  },
  outputWorkspaces: {
    configKey: "externalWorkspacesOutputWorkspaces",
    description:
      "Output the workspaces for this repo to a .json file, suitable for consumption by the plugin in another repo",
    settingType: "string",
    defaultValue: "",
  },
};

export function getConfigurationOptions(): ConfigurationOptions {
  return configSettings;
}
