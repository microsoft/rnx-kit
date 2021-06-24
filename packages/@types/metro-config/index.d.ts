// Type definitions for metro-config 0.66
// Project: https://github.com/facebook/metro
// Definitions by: Adam Foxman <https://github.com/afoxman/>
//                 Tommy Nguyen <https://github.com/tido64/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Source: https://github.com/facebook/metro/blob/25be2a8e28a2d83a56ff74f27fda8b682b250890/packages/metro-config/src/configTypes.flow.js

import type { Graph, MixedOutput, Module, SerializerOptions } from "metro";
import type { JsTransformerConfig } from "metro-transform-worker";

export type BundleCodeWithSourceMap = {
  code: string;
  map: string;
};

export type BundleCode = string | BundleCodeWithSourceMap;

export type ExtraTransformOptions = Partial<{
  readonly preloadedModules: { [path: string]: true } | false;
  readonly ramGroups: Array<string>;
  readonly transform: {
    readonly experimentalImportSupport: boolean;
    readonly inlineRequires: { blockList: { [path: string]: true } } | boolean;
    readonly nonInlinedRequires?: ReadonlyArray<string>;
    readonly unstable_disableES6Transforms?: boolean;
  };
}>;

export type GetTransformOptionsOpts = {
  dev: boolean;
  hot: boolean;
  platform?: string;
};

export type GetTransformOptions = (
  entryPoints: ReadonlyArray<string>,
  options: GetTransformOptionsOpts,
  getDependenciesOf: (filePath: string) => Promise<Array<string>>
) => Promise<ExtraTransformOptions>;

/**
 * Note that the return type changed to a `Promise` in
 * [0.60](https://github.com/facebook/metro/commit/d6b9685c730d0d63577db40f41369157f28dfa3a).
 */
export type Serializer<T = MixedOutput> = (
  entryPoint: string,
  preModules: ReadonlyArray<Module<T>>,
  graph: Graph<T>,
  options: SerializerOptions<T>
) => BundleCode | Promise<BundleCode>;

export type TransformVariants = Record<string, unknown>;

export type TransformerConfigT = JsTransformerConfig & {
  getTransformOptions: GetTransformOptions;
  transformVariants: TransformVariants;
  workerPath: string;
  publicPath: string;
  experimentalImportBundleSupport: boolean;
};
