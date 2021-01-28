import fs from "fs";
import path from "path";

export interface ResolvePathOptions {
  /**
   * by default path resolution will attempt to find the module root. This is done via retrieving the package json reference and
   * walking up a level. Setting this value to true will treat this as a reference to a specific file, or the module entry-point
   */
  resolveFile?: boolean;

  /**
   * if true this will replace backslashes to forward slashes on Windows platforms
   */
  normalize?: boolean;

  /**
   * set to true if symlinks should not be resolved
   */
  leaveSymlinks?: boolean;
}

/**
 * By default this resolves a module into a real path on disk, optionally normalizing to unix format (replacing \ with /)
 *
 * @param name - name of the module or module/filename to resolve
 * @param options - optional confinguration bits for resolution
 */
export function resolvePath(
  name: string,
  options?: ResolvePathOptions
): string {
  const { resolveFile, normalize, leaveSymlinks } = options || {};
  const requireOptions = { paths: [process.cwd()] };
  // get a path to either the module root or a file within the module
  let resolved = resolveFile
    ? path.resolve(require.resolve(name, requireOptions))
    : path.resolve(
        require.resolve(name + "/package.json", requireOptions),
        ".."
      );

  // resolve the symlink unless they are explicitly asked for
  if (!leaveSymlinks) {
    resolved = fs.realpathSync(resolved);
  }

  // finally return the result, normalizing if requested
  return normalize ? resolved.replace(/[/\\]/g, "/") : resolved;
}
