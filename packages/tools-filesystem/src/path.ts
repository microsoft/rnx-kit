import * as nodefs from "node:fs";
import * as path from "node:path";

/**
 * Returns the name of a file as stored on disk.
 */
export function realname(
  p: string,
  relativeTo: string,
  /** @internal */ fs = nodefs
): string | undefined {
  const base = path.dirname(relativeTo);
  const fullPath = path.resolve(base, p);
  if (!fs.existsSync(fullPath)) {
    return undefined;
  }

  // This is currently the only way to get the actual file name on disk, which
  // is needed to check for case sensitivity.
  // Note: We cannot use `fs.realpath.native()` because it resolves symbolic
  // links while we want the actual file itself, symbolic link or not.
  const needle = path.basename(p).toLowerCase();
  const matches = fs
    .readdirSync(path.dirname(fullPath))
    .filter((file) => file.toLowerCase() === needle);

  const numMatches = matches.length;
  if (numMatches === 0) {
    // This can only happen if the file was deleted between `existsSync()` and
    // the `readdirSync()` call, but we should still handle it gracefully.
    return undefined;
  }

  if (numMatches > 1) {
    // Only case-sensitive file systems can return multiple matches, so we can
    // be confident that the file name on disk is exact if it exists.
    return p;
  }

  // Ensure that the path string keeps the same prefix (e.g., "./") as the
  // original value.
  const filename = matches[0];
  const targetDir = path.dirname(p);
  return targetDir === "." ? `./${filename}` : `${targetDir}/${filename}`;
}
