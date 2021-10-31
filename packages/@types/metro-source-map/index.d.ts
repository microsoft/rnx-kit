// Type definitions for metro-source-map 0.66
// Project: https://github.com/facebook/metro
// Definitions by: Adam Foxman <https://github.com/afoxman/>
//                 Tommy Nguyen <https://github.com/tido64/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Source: https://github.com/facebook/metro/blob/25be2a8e28a2d83a56ff74f27fda8b682b250890/packages/metro-source-map/src/source-map.js

export type BasicSourceMap = {
  readonly file?: string;
  readonly mappings: string;
  readonly names: Array<string>;
  readonly sourceRoot?: string;
  readonly sources: Array<string>;
  readonly sourcesContent?: Array<string | undefined>;
  readonly version: number;
};

export type IndexMap = {
  readonly file?: string;
  readonly mappings?: void;
  readonly sourcesContent?: void;
  readonly sections: Array<IndexMapSection>;
  readonly version: number;
};

export type IndexMapSection = {
  map: IndexMap | BasicSourceMap;
  offset: {
    line: number;
    column: number;
  };
};

export type MixedSourceMap = IndexMap | BasicSourceMap;

type GeneratedCodeMapping = [number, number];
type SourceMapping = [number, number, number, number];
type SourceMappingWithName = [number, number, number, number, string];

export type MetroSourceMapSegmentTuple =
  | SourceMappingWithName
  | SourceMapping
  | GeneratedCodeMapping;

export type FBSourceFunctionMap = {
  readonly names: ReadonlyArray<string>;
  readonly mappings: string;
};
