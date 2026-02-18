import path from "node:path";

/**
 * Simple directory cache to track which directories have been created in the mock filesystem.
 * @returns An object with methods to interact with the directory cache.
 */
export function createDirCache() {
  const directories = new Set<string>();

  /**
   * Check if the directory exists in the cache.
   * @param p directory to test
   * @returns true if the directory exists
   */
  function has(p: string): boolean {
    return directories.has(p);
  }

  /**
   * Add a directory and all of its parent directories to the cache.
   * @param p directory to add to the cache
   */
  function add(p: string): void {
    directories.add(p);
    let dir = path.dirname(p);
    const { root } = path.parse(p);
    // walk up the directory tree until we reach the root or a directory that is already in the cache
    while (dir && dir !== root && !directories.has(dir)) {
      directories.add(dir);
      dir = path.dirname(dir);
    }
  }

  /**
   * Add a file's parent directories to the cache.
   * @param p file to add directories for in the cache
   */
  function addFile(p: string): void {
    add(path.dirname(p));
  }

  // Expose the cache methods
  return {
    has,
    add,
    addFile,
  };
}
