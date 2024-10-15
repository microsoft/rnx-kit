import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

/**
 * Invokes `tar xf`.
 */
export function untar(archive: string): SpawnSyncReturns<Buffer> {
  const args = ["xf", archive];
  const options = { cwd: path.dirname(archive) };
  const result = spawnSync("tar", args, options);

  // If we run `tar` from Git Bash with a Windows path, it will fail with:
  //
  //     tar: Cannot connect to C: resolve failed
  //
  // GNU Tar assumes archives with a colon in the file name are on another
  // machine. See also
  // https://www.gnu.org/software/tar/manual/html_section/file.html.
  if (
    process.platform === "win32" &&
    result.stderr.toString().includes("tar: Cannot connect to")
  ) {
    args.push("--force-local");
    return spawnSync("tar", args, options);
  }

  return result;
}
