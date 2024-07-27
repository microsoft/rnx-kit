import { equal, ok } from "node:assert/strict";
import * as os from "node:os";
import { afterEach, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { detectPackageManager } from "../src/packageManager";

function changeToFixtureDir(fixture: string) {
  const url = new URL(`__fixtures__/${fixture}-project`, import.meta.url);
  process.chdir(fileURLToPath(url));
}

function changeToRootDir() {
  const root = os.platform() === "win32" ? process.cwd().substring(0, 3) : "/";
  process.chdir(root);
}

describe("detectPackageManager()", () => {
  const cwd = process.cwd();

  afterEach(() => {
    process.chdir(cwd);
  });

  it("returns `undefined` when it fails to detect package manager", () => {
    changeToRootDir();
    ok(!detectPackageManager());
  });

  for (const pm of ["npm", "pnpm", "yarn"]) {
    it(`detects ${pm}`, () => {
      changeToFixtureDir(pm);
      equal(detectPackageManager(), pm);
    });
  }
});
