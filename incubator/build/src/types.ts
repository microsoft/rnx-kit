import type { Ora } from "ora";

export type DeviceType = "device" | "emulator" | "simulator";
export type Platform = "android" | "ios" | "macos" | "windows";

export type BuildParams = {
  deviceType: DeviceType;
  projectRoot: string;
  platform: Platform;
  [key: string]: string;
};

export type RepositoryInfo = {
  owner: string;
  repo: string;
};

export type UserConfig = {
  tokens: {
    github?: string;
  };
};

export type Context = RepositoryInfo & {
  ref: string;
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
