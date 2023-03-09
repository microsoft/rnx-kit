import * as os from "node:os";
import * as path from "node:path";
import { detectPackageManager } from "../lib/packageManager";

function changeToFixtureDir(fixture: string) {
  process.chdir(path.join(__dirname, "__fixtures__", fixture + "-project"));
}

function changeToRootDir() {
  const root = os.platform() === "win32" ? process.cwd().substring(0, 2) : "/";
  process.chdir(root);
}

describe("detectPackageManager", () => {
  const cwd = process.cwd();

  afterEach(() => {
    process.chdir(cwd);
  });

  test("returns `undefined` when it fails to detect package manager", async () => {
    changeToRootDir();
    expect(detectPackageManager()).toBeUndefined();
  });

  for (const pm of ["npm", "pnpm", "yarn"]) {
    test(`detects ${pm}`, async () => {
      changeToFixtureDir(pm);
      expect(detectPackageManager()).toBe(pm);
    });
  }
});
