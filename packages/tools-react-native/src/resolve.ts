import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";

export function resolveFrom(
  name: string,
  startDir: string
): string | undefined {
  return findPackageDependencyDir(name, {
    startDir,
    resolveSymlinks: true,
  });
}
