import type { TransformResultDependency } from "metro";
import type { BasicSourceMap } from "metro-source-map";

export type TransformResult = ConcreteTransformResult | LinkedTransformResult;

export type ImportNames = {
  all: string;
  default: string;
};

export type ConcreteTransformResult = {
  type: "concrete";
  code: string;
  dependencies: ReadonlyArray<TransformResultDependency>;
  map?: BasicSourceMap;
  soundResources?: Array<string>;

  // NOTE: requireName, importNames and dependencyMapName are only used by the
  // optimizer. They are deleted when the transform result is serialized to
  // JSON.
  dependencyMapName?: string;
  requireName?: string;
  importNames?: ImportNames;
};

export type LinkedTransformResult = Readonly<{
  type: "linked";
  sourceVariantName: string;
}>;

export type TransformVariants = { readonly [name: string]: unknown };
