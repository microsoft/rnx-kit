export interface IBundleInterface {
  bundleIdentifier: string;
  sourcemap: string;
}

export interface IConfigFile {
  configs: IBundleInterface[];
}

export type IArgumentsCapability = {
  help: string;
  errorFile: string;
  configFile: string;
};
