import type { ResolutionContext } from "metro-resolver";

type ExperimentalOptions = {
  experimental_retryResolvingFromDisk?: boolean | "force";
};

export type MetroResolver = typeof import("metro-resolver").resolve;

export type ResolutionContextCompat = ResolutionContext & {
  /**
   * Introduced in 0.76
   * @see {@link https://github.com/facebook/metro/commit/c6548f7ccc5b8ad59ea98f4bd7f1f5822deec0cd}
   */
  assetExts?: Set<string>;

  /**
   * Removed in 0.76
   * @see {@link https://github.com/facebook/metro/commit/c6548f7ccc5b8ad59ea98f4bd7f1f5822deec0cd}
   */
  isAssetFile?: (file: string) => boolean;
};

export type ModuleResolver = (
  context: ResolutionContextCompat,
  moduleName: string,
  platform: string
) => string;

export type Options = ExperimentalOptions & {
  remapModule?: ModuleResolver;
};
