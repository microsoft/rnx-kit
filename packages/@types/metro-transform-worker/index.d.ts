// Type definitions for metro-transform-worker 0.66
// Project: https://github.com/facebook/metro
// Definitions by: Adam Foxman <https://github.com/afoxman/>
//                 Tommy Nguyen <https://github.com/tido64/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Source: https://github.com/facebook/metro/blob/25be2a8e28a2d83a56ff74f27fda8b682b250890/packages/metro-transform-worker/src/index.js

import type {
  AllowOptionalDependencies,
  DynamicRequiresBehavior,
  TransformResultDependency,
} from "metro";
import type {
  CustomTransformOptions,
  TransformProfile,
} from "metro-babel-transformer";
import type {
  BasicSourceMap,
  FBSourceFunctionMap,
  MetroSourceMapSegmentTuple,
} from "metro-source-map";

type MinifierConfig = Readonly<Record<string, unknown>>;

export type MinifierOptions = {
  code: string;
  map?: BasicSourceMap;
  filename: string;
  reserved: ReadonlyArray<string>;
  config: MinifierConfig;
};

export type MinifierResult = {
  code: string;
  map?: BasicSourceMap;
};

export type Type = "script" | "module" | "asset";

export type JsTransformerConfig = Readonly<{
  assetPlugins: ReadonlyArray<string>;
  assetRegistryPath: string;
  asyncRequireModulePath: string;
  babelTransformerPath: string;
  dynamicDepsInPackages: DynamicRequiresBehavior;
  enableBabelRCLookup: boolean;
  enableBabelRuntime: boolean;
  experimentalImportBundleSupport: boolean;
  globalPrefix: string;
  hermesParser: boolean;
  minifierConfig: MinifierConfig;
  minifierPath: string;
  optimizationSizeLimit: number;
  publicPath: string;
  allowOptionalDependencies: AllowOptionalDependencies;
  unstable_collectDependenciesPath: string;
  unstable_dependencyMapReservedName?: string;
  unstable_disableModuleWrapping: boolean;
  unstable_disableNormalizePseudoGlobals: boolean;
  unstable_compactOutput: boolean;
}>;

export type { CustomTransformOptions } from "metro-babel-transformer";

export type JsTransformOptions = Readonly<{
  customTransformOptions?: CustomTransformOptions;
  dev: boolean;
  experimentalImportSupport?: boolean;
  hot: boolean;
  inlinePlatform: boolean;
  inlineRequires: boolean;
  minify: boolean;
  nonInlinedRequires?: ReadonlyArray<string>;
  platform?: string;
  runtimeBytecodeVersion?: number;
  type: Type;
  unstable_disableES6Transforms?: boolean;
  unstable_transformProfile: TransformProfile;
}>;

type JSFileType = "js/script" | "js/module" | "js/module/asset";

export type JsOutput = Readonly<{
  data: Readonly<{
    code: string;
    lineCount: number;
    map: Array<MetroSourceMapSegmentTuple>;
    functionMap?: FBSourceFunctionMap;
  }>;
  type: JSFileType;
}>;

// Hermes byte-code output type
export type BytecodeOutput = unknown;

type TransformResponse = Readonly<{
  dependencies: ReadonlyArray<TransformResultDependency>;
  output: ReadonlyArray<JsOutput | BytecodeOutput>;
}>;

export function transform(
  config: JsTransformerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: JsTransformOptions
): Promise<TransformResponse>;

export function getCacheKey(config: JsTransformerConfig): string;
