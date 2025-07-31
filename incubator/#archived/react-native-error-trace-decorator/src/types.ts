export type IBundleInterface = {
  bundleIdentifier: string;
  sourcemap: string;
};

export type IConfigFile = {
  configs: IBundleInterface[];
};

export type IArgumentsCapability = {
  help: string;
  errorFile: string;
  configFile: string;
};
