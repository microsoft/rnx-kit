// Type definitions for metro-transform-worker 0.66
// Project: https://github.com/facebook/metro
// Definitions by: Adam Foxman <https://github.com/afoxman/>
//                 Tommy Nguyen <https://github.com/tido64/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Source: https://github.com/facebook/metro/blob/25be2a8e28a2d83a56ff74f27fda8b682b250890/packages/metro-transform-worker/src/index.js

import type { AllowOptionalDependencies, DynamicRequiresBehavior } from "metro";
import type { BasicSourceMap } from "metro-source-map";
import type {
  CustomTransformOptions,
  TransformProfile,
} from "metro-babel-transformer";

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
  platform: ?string;
  runtimeBytecodeVersion: ?number;
  type: Type;
  unstable_disableES6Transforms?: boolean;
  unstable_transformProfile: TransformProfile;
}>;
