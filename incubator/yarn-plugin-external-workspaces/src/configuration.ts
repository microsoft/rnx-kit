import {
  getConfigurationOptions,
  loadConfigFile,
  enableLogging as turnOnLogging,
  type ConfigurationEntry,
  type Settings,
} from "@rnx-kit/tools-workspaces";
import {
  SettingsType,
  type Configuration,
  type ConfigurationDefinitionMap,
  type Project,
} from "@yarnpkg/core";

function typeStringToSettingsType(type: string): SettingsType {
  switch (type) {
    case "string":
      return SettingsType.STRING;
    case "boolean":
      return SettingsType.BOOLEAN;
    default:
      throw new Error(`Unknown type ${type}`);
  }
}

export function getConfiguration(): Partial<ConfigurationDefinitionMap> {
  const configSettings = getConfigurationOptions();
  return Object.fromEntries(
    Object.entries(configSettings).map(([_key, setting]) => [
      setting.configKey,
      {
        description: setting.description,
        type: typeStringToSettingsType(setting.settingType),
        default: setting.defaultValue,
      },
    ])
  );
}

function getStringSetting(
  configuration: Configuration,
  entry: ConfigurationEntry<string>
): string {
  const value = configuration.get(entry.configKey);
  return value && typeof value === "string" ? value : entry.defaultValue;
}

function getBooleanSetting(
  configuration: Configuration,
  entry: ConfigurationEntry<boolean>
): boolean {
  const value = configuration.get(entry.configKey);
  return value !== undefined ? Boolean(value) : entry.defaultValue;
}

let settings: Settings | undefined = undefined;

/**
 * @param project the yarn Project to get the configuration from
 * @returns fully loaded plugin settings, only loaded once, cached afterwards
 */
export function getSettingsFromProject(project: Project): Settings {
  if (!settings) {
    const base = getConfigurationOptions();
    const configuration = project.configuration;
    const configPath = getStringSetting(configuration, base.configPath);
    const enableLogging = getBooleanSetting(configuration, base.enableLogging);
    const outputWorkspaces = getStringSetting(
      configuration,
      base.outputWorkspaces
    );
    const finder = loadConfigFile(configPath);

    // turn on logging if enabled
    if (enableLogging) {
      turnOnLogging();
    }

    // save teh settings
    settings = { configPath, enableLogging, outputWorkspaces, finder };
  }
  return settings;
}
