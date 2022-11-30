import type { ResolutionContext as MetroResolutionContext } from "metro-resolver";

type ExperimentalOptions = {
  experimental_retryResolvingFromDisk?: boolean | "force";
};

export type MetroResolver = typeof import("metro-resolver").resolve;

export type ResolutionContext = Pick<
  MetroResolutionContext,
  "extraNodeModules" | "originModulePath"
>;

export type ModuleResolver = (
  context: ResolutionContext,
  moduleName: string,
  platform: string
) => string;

export type Options = ExperimentalOptions & {
  remapModule?: ModuleResolver;
};
