import nodefs from "node:fs";
import { toFSEntry, type FSEntry } from "./entry.ts";

// file chunk size for comparisons and determining whether to read entire file into memory for comparisons
const CHUNK_SIZE = 128 * 1024;

/**
 * Compares the stats of two files to determine if they refer to the same file. This preempts more expensive file comparisons
 * by comparing the stats first. This will return:
 * - true if the stats indicate the files are the same (e.g. same inode and device)
 * - false if the stats indicate the files are different (e.g. different sizes)
 * - undefined if the stats are inconclusive and further checks are needed (e.g. same size but different inodes)
 *
 * @param stats1 The stats of the first file.
 * @param stats2 The stats of the second file.
 * @returns true if the stats indicate the files are the same, false if they indicate they are different, or undefined if inconclusive.
 */
export function isSameFileFromStats(
  stats1: nodefs.BigIntStats,
  stats2: nodefs.BigIntStats
): boolean | undefined {
  // Check if both stats refer to the same file, handles hardlinks and other ways to reference the
  // same file on disk. This is a definitive check that does not require further checks. Note that these values can
  // overflow non-BigInt stats on certain filesystems, so we need to use BigInt stats for this check.
  if (
    stats1.ino &&
    stats1.dev &&
    stats1.ino === stats2.ino &&
    stats1.dev === stats2.dev
  ) {
    // return definite match
    return true;
  }

  if (stats1.size !== stats2.size) {
    // return definite non-match
    return false;
  }

  // return undefined to indicate further checks are needed
  return undefined;
}

/**
 * Compare two files to determine if two files are identical in content. This means either the content
 * matches or they are actually referencing the same file on disk (e.g. via a hardlink).
 * @param path1 The first file to compare.
 * @param path2 The second file to compare.
 * @returns true if the files are identical, false otherwise.
 */
export function filesMatchSync(
  path1: FSEntry | string,
  path2: FSEntry | string,
  /** @internal */ fs: typeof nodefs = nodefs
): boolean {
  const f1 = toFSEntry(path1, fs);
  const f2 = toFSEntry(path2, fs);

  // do a quick stats comparison first to preempt more expensive checks if possible
  const sameFromStats = isSameFileFromStats(f1.stats, f2.stats);
  if (sameFromStats !== undefined) {
    return sameFromStats;
  }

  // at this point, we know the sizes are the same, so we can use either file's size
  if (f1.contentLoaded || f2.contentLoaded || f1.size <= CHUNK_SIZE) {
    // if either file is already loaded, or if the file is small enough that reading it entirely into memory is not a big deal, then do a simple content comparison
    return f1.content === f2.content;
  }

  // otherwise, do a chunk-by-chunk comparison to avoid reading the entire file into memory at once
  let fileA: number | undefined;
  let fileB: number | undefined;

  try {
    fileA = fs.openSync(f1.path, "r");
    fileB = fs.openSync(f2.path, "r");

    const bufA = Buffer.alloc(CHUNK_SIZE);
    const bufB = Buffer.alloc(CHUNK_SIZE);

    while (true) {
      const bytesA = fs.readSync(fileA, bufA, 0, bufA.length, null);
      const bytesB = fs.readSync(fileB, bufB, 0, bufB.length, null);
      if (bytesA !== bytesB) return false;
      if (bytesA === 0) break;
      if (
        Buffer.compare(bufA.subarray(0, bytesA), bufB.subarray(0, bytesB)) !== 0
      ) {
        return false;
      }
    }
  } finally {
    if (fileA !== undefined) {
      fs.closeSync(fileA);
    }
    if (fileB !== undefined) {
      fs.closeSync(fileB);
    }
  }

  return true;
}

/**
 * Try to efficiently determine if two files match by size and content
 * @param pathA file path A
 * @param pathB file path B
 * @returns true or false depending on whether the files match
 */
export async function filesMatch(
  pathA: FSEntry | string,
  pathB: FSEntry | string,
  /** @internal */ fs: typeof nodefs = nodefs
): Promise<boolean> {
  const f1 = toFSEntry(pathA, fs);
  const f2 = toFSEntry(pathB, fs);

  // do a quick stats comparison first to preempt more expensive checks if possible
  const [stats1, stats2] = await Promise.all([f1.getStats(), f2.getStats()]);
  const sameFromStats = isSameFileFromStats(stats1, stats2);
  if (sameFromStats !== undefined) {
    return sameFromStats;
  }

  // at this point, we know the sizes are the same, so we can use either file's size
  const size = f1.size;
  if (f1.contentLoaded || f2.contentLoaded || size <= CHUNK_SIZE) {
    // if either file is already loaded, or if the file is small enough that reading it entirely into memory is not a big deal, then do a simple content comparison
    const [content1, content2] = await Promise.all([
      f1.getContent(),
      f2.getContent(),
    ]);
    return content1 === content2;
  }

  // now do a side by side stream compare
  const streamOptions = { highWaterMark: CHUNK_SIZE };
  const streamA = fs.createReadStream(f1.path, streamOptions);
  const streamB = fs.createReadStream(f2.path, streamOptions);

  // iterate through both streams in parallel
  const iterA = streamA[Symbol.asyncIterator]();
  const iterB = streamB[Symbol.asyncIterator]();

  try {
    while (true) {
      const [resultA, resultB] = await Promise.all([
        iterA.next(),
        iterB.next(),
      ]);

      // if one is done, it is equal if both are done, otherwise not equal
      if (resultA.done || resultB.done) {
        return Boolean(resultA.done && resultB.done);
      }

      // compare the chunks
      const chunkA: Buffer = resultA.value;
      const chunkB: Buffer = resultB.value;
      if (Buffer.compare(chunkA, chunkB) !== 0) {
        return false;
      }
    }
  } finally {
    // ensure streams are closed
    streamA.destroy();
    streamB.destroy();
  }
}
