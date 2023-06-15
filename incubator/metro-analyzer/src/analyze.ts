import fs from "fs";
import { DOWNLOAD_SPEED } from "./constants.js";
import {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
} from "./duplicates.js";
import type { Metafile } from "./metafile.js";
import {
  output,
  outputDuplicates,
  outputWhyDuplicateInBundle,
} from "./output.js";
import { stats } from "./stats.js";
import { webpackStats as webpackStats } from "./webpackStats.js";
import { info } from "@rnx-kit/console";
import * as path from "path";

/**
 * Analyzes a esbuild metafile.
 *
 * @param metafilePath The esbuild metafile to analyze
 * @param detailed Whether to output detailed information about duplicates
 * @param transform Generate a webpack stats file based on the
 * esbuild metafile and set the output file to write the stats file to
 * @param jsonFile Output file to write analysis information to in JSON format
 */
export async function analyze(
  metafilePath: string,
  detailed: boolean,
  transformPath?: string,
  jsonFile?: string
) {
  const content = fs.readFileSync(metafilePath, { encoding: "utf-8" });
  const metafile: Metafile = JSON.parse(content);
  const metafileDir = path.dirname(metafilePath);
  const statsPath = transformPath || path.join(metafileDir, "stats.json");
  const jsonPath = jsonFile ? jsonFile : path.join(metafileDir, "result.json");
  const graph = generateGraph(metafile);

  if (transformPath !== undefined) {
    webpackStats(metafile, metafileDir, false, statsPath, graph);
  }

  const duplicates = getDuplicates(metafile.inputs);
  if (!duplicates.length) {
    info(`No duplicates found in ${metafilePath}`);
  } else {
    outputDuplicates(duplicates);

    if (detailed) {
      outputWhyDuplicateInBundle(getWhyDuplicatesInBundle(metafile, graph));
    }
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
