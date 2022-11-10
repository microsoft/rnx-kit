import type { ResolutionContext as MetroResolutionContext } from "metro-resolver";

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

export type Options = {
  remapModule?: ModuleResolver;
};
