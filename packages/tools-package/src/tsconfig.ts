import fs from "node:fs";
import path from "node:path";
import { createPackageInfoAccessor } from "./package";
import type { PackageInfo, PackageInfoAccessor } from "./types";

const tsconfigKey = Symbol("tsconfig");

function loadTsConfig(pkgInfo: PackageInfo) {
  const tsconfigPath = path.join(pkgInfo.root, "tsconfig.json");
  return fs.existsSync(tsconfigPath) ? tsconfigPath : undefined;
}

export const getTsConfigPath: PackageInfoAccessor<string | undefined> =
  createPackageInfoAccessor(tsconfigKey, loadTsConfig);
