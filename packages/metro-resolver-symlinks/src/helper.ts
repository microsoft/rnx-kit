import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";

export function resolveFrom(
  moduleName: string,
  startDir: string
): string | undefined {
  return findPackageDependencyDir(moduleName, {
    startDir,
    resolveSymlinks: true,
  });
}
