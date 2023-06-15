import { promises as fs } from "fs";
import type { Metafile } from "./metafile.js";
import { outputDiffToConsole } from "./output.js";
import { stats } from "./stats.js";

/**
 * Compares two esbuild metafiles and outputs the differences.
 *
 * @param baselinePath Path to the baseline metafile
 * @param candidatePath Path to the candidate metafile
 */
export async function compare(
  baselinePath: string,
  candidatePath: string
): Promise<void> {
  const baseline = await readMetafile(baselinePath);
  const candidate = await readMetafile(candidatePath);

  outputDiffToConsole(stats(baseline), stats(candidate));
}

async function readMetafile(filePath: string): Promise<Metafile> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as Metafile;
}
