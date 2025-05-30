import type { BundleOptions, OutputOptions } from "metro/src/shared/types";

export type BundleArgs = {
  assetsDest?: string;
  assetCatalogDest?: string;
  entryFile: string;
  resetCache?: boolean;
  resetGlobalCache?: boolean;
  transformer?: string;
  minify?: boolean;
  config?: string;
  platform: string;
  dev: boolean;
  bundleOutput: string;
  bundleEncoding?: OutputOptions["bundleEncoding"];
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath: boolean;
  verbose?: boolean;
  unstableTransformProfile?: BundleOptions["unstable_transformProfile"];
};

export type RequestOptions = {
  entryFile: string;
  sourceMapUrl?: string;
  dev: boolean;
  minify: boolean;
  platform: string;
  unstable_transformProfile?: BundleOptions["unstable_transformProfile"];
};
