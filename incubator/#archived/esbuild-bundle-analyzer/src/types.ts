export type Stats = {
  files: number;
  totalBytes: number;
  esmBytes: number;
  cjsBytes: number;
  otherBytes: number;
  nodeModules: number;
  nodeModulesBytes: number;
  countOut: number;
  bytesOut: number;
};

export type Format = "esm" | "cjs";

export type Result = {
  data: Stats;
  slowDownloadTime: number;
  fastDownloadTime: number;
  avgFileSize: number;
  avgFileSizeNodeModules: number;
};

export type Import = {
  input: string;
  original: string | undefined;
  kind: string;
};

export type Graph = {
  entryPoints: Record<string, string>;
  imports: Record<string, Import>;
};

export type Item = {
  input: string;
  import: Import | undefined;
};

export type Path = Record<string, Item>;

export type ModuleMap = Record<string, Record<string, Set<string>>>;

export type Duplicate = {
  copies: number;
  module: string;
  versions: ModuleMap["module"];
};

/**
 * TODO: Update this so the data we generate is not only a subset of Webpack types
 * consumed by @mixer/webpack-bundle-compare. So, this tool can generate webpack
 * stats file that's even more compatible with other third-party tools.
 *
 * The types are defined in detail here: https://webpack.js.org/api/stats/
 * This is a subset of the types provided by webpack, where we only care
 * about the types that are relevant to us which are the types consumed
 * and used by @mixer/webpack-bundle-compare.
 */
export type WebpackStats = {
  chunks: StatsChunk[];
  modules: StatsModule[];
  errors: string[];
  warnings: string[];
  time: number;
  builtAt: number;
  outputPath: string;
};

type StatsChunk = {
  entry: boolean;
  size: number;
  names?: string[];
  id?: string | number;
  parents?: (string | number)[];
};

type StatsModule = {
  type?: string;
  identifier?: string;
  name?: string;
  size?: number;
  issuerPath?: StatsModuleIssuer[];
  id?: string | number;
  chunks?: (string | number)[];
  reasons?: StatsModuleReason[];
  usedExports?: boolean | string[];
};

export type StatsModuleIssuer = {
  name?: string;
};

export type StatsModuleReason = {
  type?: string;
  module?: string;
  moduleName?: string;
  userRequest?: string;
  loc?: string;
};
