import type {
  Configuration,
  ConfigurationDefinitionMap,
  ConfigurationValueMap,
  Project,
  SettingsDefinition,
} from "@yarnpkg/core";
import { SettingsType } from "@yarnpkg/core";
import { loadConfigFile } from "./finder";
import { enableLogging } from "./logging";
import type { DefinitionFinder } from "./types";

// range protocol used to resolve external workspaces
const PROTOCOL = "external:";

type TypedSettings<T> = Omit<SettingsDefinition, "default"> & { default: T };
type ConfigurationEntry<T> = {
  /**
   * The key used to store the setting in the yarn configuration
   */
  configKey: keyof ConfigurationValueMap;

  /**
   * Function for type coercion
   */
  coerce: (value: unknown, fallback: T) => T;

  /**
   * The options for the setting to be provided to yarn in plugin initialization
   */
  options: TypedSettings<T>;
};

type ConfigurationOptions = {
  configPath: ConfigurationEntry<string>;
  enableLogging: ConfigurationEntry<boolean>;
};

// type inference helper for having strongly typed settings
type ConfigurationEntryValue<T> =
  T extends ConfigurationEntry<infer U> ? U : never;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type ConfigurationSettings = {
  [key in keyof ConfigurationOptions]: ConfigurationEntryValue<
    ConfigurationOptions[key]
  >;
};

/**
 * Fully loaded settings for the plugin
 */
export type Settings = ConfigurationSettings & {
  finder: DefinitionFinder;
};

/**
 * Only do the settings load one time. Because the actual settings can't be loaded until either a command, a hook,
 * or a resolver is called, we have to use a global variable to store the settings so they can be ensured in the various
 * calls, but only loaded once.
 */
let settings: Settings | undefined = undefined;

/**
 * Settings for the plugin, used to both load from the configuration and configure the plugin
 */
const configSettings: ConfigurationOptions = {
  configPath: {
    configKey: "externalWorkspacesConfig" as keyof ConfigurationValueMap,
    coerce: coerceString,
    options: {
      description: `Path to the external dependencies provider, either './filename.json/key1/key2' or './src/lookup.js|.cjs' `,
      type: SettingsType.STRING,
      default: "./package.json/external-workspaces",
    },
  },
  enableLogging: {
    configKey: "externalWorkspacesEnableLogging" as keyof ConfigurationValueMap,
    coerce: coerceBoolean,
    options: {
      description: `Turn on debug logging and log output to plugin-external-workspaces.log`,
      type: SettingsType.BOOLEAN,
      default: false,
    },
  },
};

export function getConfigurationOptions(): ConfigurationOptions {
  return configSettings;
}

function coerceString(value: unknown, fallback: string): string {
  return value && typeof value === "string" ? value : fallback;
}

function coerceBoolean(value: unknown, _fallback: boolean): boolean {
  return Boolean(value);
}

export function getConfiguration(): Partial<ConfigurationDefinitionMap> {
  return Object.fromEntries(
    Object.entries(configSettings).map(([_key, setting]) => [
      setting.configKey,
      setting.options,
    ])
  );
}

function loadSetting<T>(
  setting: ConfigurationEntry<T>,
  configuration: Configuration
): T {
  const value = configuration.get(setting.configKey);
  return setting.coerce(value, setting.options.default);
}

function loadSettingsFromConfiguration(
  configuration: Configuration
): ConfigurationSettings {
  return {
    configPath: loadSetting(configSettings.configPath, configuration),
    enableLogging: loadSetting(configSettings.enableLogging, configuration),
  };
}

/**
 * @param project the yarn Project to get the configuration from
 * @returns fully loaded plugin settings, only loaded once, cached afterwards
 */
export function getSettingsFromProject(project: Project): Settings {
  if (!settings) {
    const configSettings = loadSettingsFromConfiguration(project.configuration);

    // turn on logging if enabled
    if (configSettings.enableLogging) {
      enableLogging();
    }

    // load the finder function from the config file and remember the result
    settings = {
      ...configSettings,
      finder: loadConfigFile(configSettings.configPath),
    };
  }
  return settings;
}

/**
 * @returns the range protocol used by this plugin
 */
export function getProtocol(): string {
  return PROTOCOL;
}
