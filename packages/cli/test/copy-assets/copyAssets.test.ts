import { readTextFileSync as readText } from "@rnx-kit/tools-filesystem";
import { getMockFSFiles, mockFS } from "@rnx-kit/tools-filesystem/mocks";
import * as path from "node:path";
import { copyAssets, gatherConfigs, versionOf } from "../../src/copy-assets.ts";

const options = {
  platform: "ios" as const,
  assetsDest: "dist",
  bundleAar: false,
  xcassetsDest: "xcassets",
};

const context = {
  projectRoot: path.resolve(__dirname, "..", ".."),
  manifest: {
    name: "@rnx-kit/cli",
    version: "0.0.0-dev",
  },
  options,
  reactNativePath: require.resolve("react-native"),
};

describe("copy-assets/copyAssets()", () => {
  test("returns early if there is nothing to copy", async () => {
    const fs = mockFS();
    await copyAssets(context, "test", {}, fs);
    const files = getMockFSFiles(fs);
    expect(Object.keys(files)).toEqual([]);
  });

  test("copies assets", async () => {
    const filename = "arnolds-greatest-movies.md";
    const content = "all of them";
    const files: Record<string, string> = { [filename]: content };
    const fs = mockFS(files);

    await copyAssets(context, "test", { assets: [filename] }, fs);

    expect(readText(filename, fs)).toEqual(content);
    expect(readText(path.join("dist", "assets", "test", filename), fs)).toEqual(
      content
    );
  });

  test("copies strings", async () => {
    const filename = "arnolds-greatest-lines.md";
    const content = "all of them";
    const files: Record<string, string> = { [filename]: content };
    const fs = mockFS(files);

    await copyAssets(context, "test", { strings: [filename] }, fs);

    const subDir = path.join("dist", "strings", "test");
    expect(readText(filename, fs)).toEqual(content);
    expect(fs.statSync(subDir).isDirectory()).toBe(true);
    expect(readText(path.join(subDir, filename), fs)).toEqual(content);
  });

  test("copies Xcode asset catalogs", async () => {
    const filename = "arnolds-greatest-assets.xcassets";
    const content = "all of them";
    const files: Record<string, string> = { [filename]: content };
    const fs = mockFS(files);

    await copyAssets(context, "test", { xcassets: [filename] }, fs);

    expect(readText(filename, fs)).toEqual(content);
    expect(readText(path.join("xcassets", filename), fs)).toEqual(content);
  });

  test("does not copy Xcode asset catalogs if destination path is unset", async () => {
    const filename = "arnolds-greatest-assets.xcassets";
    const content = "all of them";
    const fs = mockFS({ [filename]: content });

    await copyAssets(
      { ...context, options: { ...options, xcassetsDest: undefined } },
      "test",
      { xcassets: [filename] },
      fs
    );

    expect(readText(filename, fs)).toEqual(content);
    expect(fs.existsSync(path.join("xcassets", filename))).toBe(false);
  });
});

describe("copy-assets/gatherConfigs()", () => {
  test("returns early if there is nothing to copy", async () => {
    expect(await gatherConfigs(context)).toBeUndefined();
  });
});

describe("copy-assets/versionOf()", () => {
  test("returns the version of specified package", () => {
    expect(versionOf("@rnx-kit/tools-node")).toMatch(/^\d+[.\d]+$/);
  });

  test("throws if package is not installed", () => {
    expect(() => versionOf("some-package-that-does-not-exist")).toThrow();
  });
});
