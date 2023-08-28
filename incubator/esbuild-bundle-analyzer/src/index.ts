export { analyze } from "./analyze";
export { compare, readMetafile } from "./compare";
export {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
  getWhyFileInBundle,
} from "./duplicates";

export {
  output,
  outputDiffToConsole,
  outputWhyDuplicateInBundle,
} from "./output";

export { stats } from "./stats";
export { transform } from "./webpackStats";

export type {
  Duplicate,
  Format,
  Graph,
  Import,
  Item,
  ModuleMap,
  Path,
  Result,
  Stats,
  StatsModuleIssuer,
  StatsModuleReason,
  WebpackStats,
} from "./types";
