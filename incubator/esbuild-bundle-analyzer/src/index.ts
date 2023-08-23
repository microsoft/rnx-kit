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
export { webpackStats } from "./webpackStats";
