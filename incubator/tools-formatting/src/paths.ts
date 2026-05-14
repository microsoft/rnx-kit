import path from "node:path";
import { ELLIPSIS, SEPARATORS, SRC_DIRS } from "./const.ts";

/**
 * Utility function for formatting file paths in a short form for display purposes. In particular,
 * this will shorten to the path to the last 3 segments, and replace the rest with an ellipsis. For example:
 *   /Users/someuser/dev/rnx-kit/packages/metro-resolver-symlinks/src/metro-resolver.ts
 * would be shortened to:
 *   .../metro-resolver-symlinks/src/metro-resolver.ts
 *
 * If the last path segment is a known source directory (e.g. "src", "lib", "dist", "bin"), then it will
 * return the last 4 segments instead.
 *
 * This is useful for displaying file paths in a table format where space is limited and focusing attention
 * on the most significant parts of the path.
 * @param path The file path to shorten
 * @param segments The number of path segments to include in the shortened path (default is 3)
 * @returns The shortened file path
 */
export function shortenPath(path: string, segments = 3): string {
  let last = -1;
  for (let i = path.length - 1; i > ELLIPSIS.length; i--) {
    if (SEPARATORS.includes(path[i])) {
      segments--;
      if (segments === 0) {
        // check the last slice to see if it starts with a known source dir, if so keep iterating.
        if (last > i && SRC_DIRS.includes(path.slice(i + 1, last))) {
          segments++;
          last = -1;
        } else {
          return ELLIPSIS + path.slice(i);
        }
      } else {
        last = i;
      }
    }
  }
  return path;
}

/**
 * Normalize a path for display in messages so that links work correctly in GitHub and Azure DevOpts. This
 * also makes them readable in normal logs as well as it normalizes them to forward slashes and makes them
 * relative to the repo root if a root is provided.
 * @param file The file path to normalize
 * @param root The root directory to make the file path relative to (optional)
 * @returns The normalized file path
 */
export function normalizePath(file: string, root?: string): string {
  const filePath = root ? path.relative(root, file) : file;
  return path.posix.normalize(filePath);
}
