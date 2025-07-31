import { error } from "@rnx-kit/console";
import { getErrorMessage } from "@rnx-kit/metro-plugin-duplicates-checker";
import * as path from "path";
import { readMetafile } from "./compare";
import {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
} from "./duplicates";
import { output, outputWhyDuplicateInBundle } from "./output";
import { stats } from "./stats";

/**
 * Analyzes a esbuild metafile.
 *
 * @param metafilePath The esbuild metafile to analyze
 * @param showDuplicates Whether to output detailed information about duplicates
 * @param namespace The namespace to remove from every module to get cleaner output
 * @param jsonFile Output file to write analysis information to in JSON format
 */
export function analyze(
  metafilePath: string,
  showDuplicates: boolean,
  namespace = "",
  jsonFile?: string
): void {
  const metafile = readMetafile(metafilePath);
  const metafileDir = path.dirname(metafilePath);
  const metafileName = path.parse(metafilePath).name;
  const jsonFileName = `${metafileName}_result.json`;
  const jsonPath = jsonFile ? jsonFile : path.join(metafileDir, jsonFileName);
  const graph = generateGraph(metafile);

  const result = getDuplicates(metafile.inputs, namespace);
  const errorMessage = getErrorMessage(result);
  if (errorMessage) {
    error(errorMessage);
    if (showDuplicates) {
      outputWhyDuplicateInBundle(
        getWhyDuplicatesInBundle(metafile, graph),
        namespace
      );
    }
  }

  const SLOW_DOWNLOAD_SPEED = 50; // 3G - 50 kbps
  const FAST_DOWNLOAD_SPEED = 875; // 4G - 875 kbps
  const data = stats(metafile);
  output(
    {
      data: data,
      slowDownloadTime: Math.round(
        data.totalBytes / 1024 / SLOW_DOWNLOAD_SPEED
      ),
      fastDownloadTime: Math.round(
        data.totalBytes / 1024 / FAST_DOWNLOAD_SPEED
      ),
      avgFileSize: Math.round(data.totalBytes / data.files),
      avgFileSizeNodeModules: Math.round(
        data.nodeModulesBytes / data.nodeModules
      ),
    },
    jsonFile !== undefined ? jsonPath : undefined
  );
}
