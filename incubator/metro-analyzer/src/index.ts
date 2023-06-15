export { analyze } from "./analyze.js";
export { compare } from "./compare.js";
export {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
  getWhyFileInBundle,
} from "./duplicates.js";

export {
  output,
  outputDiffToConsole,
  outputDuplicates,
  outputWhyDuplicateInBundle,
} from "./output.js";

export { stats } from "./stats.js";
export { webpackStats } from "./webpackStats.js";
