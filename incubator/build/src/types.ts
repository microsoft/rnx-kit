import type { Ora } from "ora";

export type Platform = "android" | "ios" | "macos" | "windows";

export type RepositoryInfo = {
  owner: string;
  repo: string;
};

export type UserConfig = {
  tokens: {
    github?: string;
  };
};

export type BuildParams = {
  projectRoot: string;
  platform: Platform;
  [key: string]: string;
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
