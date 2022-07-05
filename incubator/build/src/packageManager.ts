import findUp from "find-up";
import * as path from "node:path";

type PackageManager = "npm" | "pnpm" | "yarn";

const PACKAGE_MANAGERS: Record<string, PackageManager> = {
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
};

export async function detectPackageManager(): Promise<
  PackageManager | undefined
> {
  const lockfile = await findUp(Object.keys(PACKAGE_MANAGERS));
  return lockfile ? PACKAGE_MANAGERS[path.basename(lockfile)] : undefined;
}
