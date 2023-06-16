import { DOWNLOAD_SPEED } from "./constants.js";
import {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
} from "./duplicates.js";
import { output, outputWhyDuplicateInBundle } from "./output.js";
import { stats } from "./stats.js";
import { webpackStats as webpackStats } from "./webpackStats.js";
import * as path from "path";
import { readMetafile } from "./compare.js";

/**
 * Analyzes a esbuild metafile.
 *
 * @param metafilePath The esbuild metafile to analyze
 * @param showDuplicates Whether to output detailed information about duplicates
 * @param transform Generate a webpack stats file based on the
 * esbuild metafile and set the output file to write the stats file to
 * @param jsonFile Output file to write analysis information to in JSON format
 */
export async function analyze(
  metafilePath: string,
  showDuplicates: boolean,
  transformPath?: string,
  jsonFile?: string
) {
  const metafile = readMetafile(metafilePath);
  const metafileDir = path.dirname(metafilePath);
  const statsPath = transformPath || path.join(metafileDir, "stats.json");
  const jsonPath = jsonFile ? jsonFile : path.join(metafileDir, "result.json");
  const graph = generateGraph(metafile);

  if (transformPath !== undefined) {
    webpackStats(metafile, metafileDir, false, statsPath, graph);
  }

  const result = getDuplicates(metafile.inputs);
  if (result.duplicates && showDuplicates) {
    outputWhyDuplicateInBundle(getWhyDuplicatesInBundle(metafile, graph));
  }

  const data = stats(metafile);
  output(
    {
      data: data,
      buildTime: 0,
      downloadTime: Math.round((data.totalBytes * 8) / DOWNLOAD_SPEED),
      avgFileSize: Math.round(data.totalBytes / data.files),
      avgFileSizeNodeModules: Math.round(
        data.nodeModulesBytes / data.nodeModules
      ),
    },
    jsonFile !== undefined ? jsonPath : undefined
  );
}
