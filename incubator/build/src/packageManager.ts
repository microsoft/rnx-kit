import { findUp } from "@rnx-kit/tools-node/path";
import * as path from "node:path";

const PACKAGE_MANAGERS = {
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
} as const;

type LockFile = keyof typeof PACKAGE_MANAGERS;
type PackageManager = (typeof PACKAGE_MANAGERS)[LockFile];

export function detectPackageManager(): PackageManager | undefined {
  const file = findUp(Object.keys(PACKAGE_MANAGERS));
  return file ? PACKAGE_MANAGERS[path.basename(file) as LockFile] : undefined;
}
