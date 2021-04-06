// Adapted from: https://github.com/facebook/metro/blob/master/packages/metro-source-map/src/source-map.js

export type BasicSourceMap = {
  sources: Array<string>;
};

export type IndexMapSection = {
  map: IndexMap | BasicSourceMap;
  offset: {
    line: number;
    column: number;
  };
};

export type IndexMap = {
  sections: IndexMapSection[];
};

export type MixedSourceMap = IndexMap | BasicSourceMap;

export type PostProcessBundleSourceMap = {
  code: string | Buffer;
  map: MixedSourceMap;
  outFileName: string;
};
