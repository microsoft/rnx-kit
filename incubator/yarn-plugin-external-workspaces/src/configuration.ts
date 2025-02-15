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
