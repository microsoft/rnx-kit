import * as fs from "fs";
import { detectPackageManager } from "../src/packageManager";

jest.mock("fs");

function setMockFiles(files: Record<string, string>): void {
  // @ts-expect-error This is a mock function
  fs.__setMockFiles(files);
}

describe("detectPackageManager", () => {
  afterEach(() => {
    setMockFiles({});
  });

  test("returns `undefined` when it fails to detect package manager", async () => {
    expect(await detectPackageManager()).toBeUndefined();
  });

  test("detects npm", async () => {
    setMockFiles({
      "package-lock.json": "npm",
      "pnpm-lock.yaml": "pnpm",
    });
    expect(await detectPackageManager()).toBe("npm");
  });

  test("detects pnpm", async () => {
    setMockFiles({
      "pnpm-lock.yaml": "pnpm",
    });
    expect(await detectPackageManager()).toBe("pnpm");
  });

  test("detects Yarn", async () => {
    setMockFiles({
      "yarn.lock": "yarn",
      "package-lock.json": "npm",
      "pnpm-lock.yaml": "pnpm",
    });
    expect(await detectPackageManager()).toBe("yarn");
  });
});
