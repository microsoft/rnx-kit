import type { Ora } from "ora";
import type { DEVICE_TYPES, DEPLOYMENT, PLATFORMS } from "./constants";

export type Deployment = typeof DEPLOYMENT[number];
export type DeviceType = typeof DEVICE_TYPES[number];
export type Platform = typeof PLATFORMS[number];

export type BuildParams = {
  platform: Platform;
  deviceType: DeviceType;
  distribution: string;
  packageManager: string;
  projectRoot: string;
  scheme: string;
  [key: string]: string;
};

export type JSObject = {
  [key: string]: string | number | boolean | JSObject;
};

export type RepositoryInfo = {
  owner: string;
  repo: string;
};

export type UserConfig = {
  github?: {
    token: string;
  };
};

export type Context = RepositoryInfo & {
  ref: string;
};

export type Distribution = {
  deploy: (
    artifact: string,
    params: BuildParams,
    spinner: Ora
  ) => Promise<void>;
  getConfigString: (
    platform: Platform,
    config: JSObject | undefined
  ) => Promise<string>;
};

export type Remote = {
  build(
    context: Context,
    inputs: BuildParams,
    spinner: Ora
  ): Promise<string | null>;
  cancelBuild(context: Context): Promise<void>;
  install(): Promise<number>;
};
