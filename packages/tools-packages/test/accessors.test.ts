import { deepEqual } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createPackageValueLoader } from "../src/accessors.ts";
import { getPackageInfoFromPath, getRootPackageInfo } from "../src/package.ts";
import type { PackageInfo } from "../src/types.ts";

function loadTsConfig(pkgInfo: PackageInfo) {
  const tsconfigPath = path.join(pkgInfo.root, "tsconfig.json");
  return fs.existsSync(tsconfigPath) ? tsconfigPath : undefined;
}

const getTsConfigPath = createPackageValueLoader("tsconfigPath", loadTsConfig);

describe("package value loader", () => {
  it("returns undefined when no value is found", () => {
    const rootInfo = getRootPackageInfo();
    const value = getTsConfigPath(rootInfo);
    deepEqual(value, undefined);
  });

  it("returns the value when found", () => {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkgInfo = getPackageInfoFromPath(pkgPath);
    const value = getTsConfigPath(pkgInfo);
    deepEqual(value, path.join(pkgInfo.root, "tsconfig.json"));
    deepEqual(pkgInfo.workspace, true);
  });
});
