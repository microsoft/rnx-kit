import * as fs from "fs";
import * as path from "path";

type FileType = "file" | "directory";

type FindUpOptions = {
  type?: FileType;
  startDir?: string;
  stopAt?: string;
  allowSymlinks?: boolean;
};

function exists(name: string, type: FileType, stat: fs.StatSyncFn): boolean {
  try {
    const stats = stat(name, { throwIfNoEntry: false });
    switch (type) {
      case "file":
        return Boolean(stats?.isFile());
      case "directory":
        return Boolean(stats?.isDirectory());
    }
  } catch (_) {
    // ignore
  }
  return false;
}

/**
 * Finds the specified file(s) or directory(s) by walking up parent directories.
 * @param names One or multiple names to search for
 * @param options
 */
export function findUp(
  names: string | string[],
  {
    type = "file",
    startDir = process.cwd(),
    stopAt,
    allowSymlinks = true,
  }: FindUpOptions = {}
): string | undefined {
  const stat = allowSymlinks ? fs.statSync : fs.lstatSync;
  let directory = path.resolve(startDir);
  const { root } = path.parse(directory);
  stopAt = path.resolve(directory, stopAt ?? root);

  names = Array.isArray(names) ? names : [names];
  while (directory && directory !== stopAt && directory !== root) {
    for (const name of names) {
      const p = path.isAbsolute(name) ? name : path.join(directory, name);
      if (exists(p, type, stat)) {
        return p;
      }
    }

    directory = path.dirname(directory);
  }

  return undefined;
}

/**
 * Normalize the separators in a path, converting each backslash ('\\') to a foreward
 * slash ('/').
 *
 * @param p Path to normalize
 * @returns Normalized path
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
