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

  test("detects npm", async () => {
    changeToFixtureDir("npm");
    expect(detectPackageManager()).toBe("npm");
  });

  test("detects pnpm", async () => {
    changeToFixtureDir("pnpm");
    expect(detectPackageManager()).toBe("pnpm");
  });

  test("detects Yarn", async () => {
    changeToFixtureDir("yarn");
    expect(detectPackageManager()).toBe("yarn");
  });
});
