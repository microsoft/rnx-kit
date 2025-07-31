import fs from "fs";
import type { Metafile } from "./metafile";
import { outputDiffToConsole } from "./output";
import { stats } from "./stats";

/**
 * Compares two esbuild metafiles and outputs the differences.
 *
 * @param baselinePath Path to the baseline metafile
 * @param candidatePath Path to the candidate metafile
 */
export function compare(baselinePath: string, candidatePath: string): void {
  const baseline = readMetafile(baselinePath);
  const candidate = readMetafile(candidatePath);

  outputDiffToConsole(stats(baseline), stats(candidate));
}

export function readMetafile(filePath: string): Metafile {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  return JSON.parse(content) as Metafile;
}
