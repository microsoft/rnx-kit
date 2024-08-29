import { mockFS } from "@rnx-kit/tools-filesystem/mocks";
import * as path from "node:path";
import { copyAssets, gatherConfigs, versionOf } from "../../src/copy-assets";

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
  const mkdirOptions = JSON.stringify({ recursive: true, mode: 0o755 });

  test("returns early if there is nothing to copy", async () => {
    const files = {};
    await copyAssets(context, "test", {}, mockFS(files));
    expect(Object.keys(files)).toEqual([]);
  });

  test("copies assets", async () => {
    const filename = "arnolds-greatest-movies.md";
    const content = "all of them";
    const files = { [filename]: content };

    await copyAssets(context, "test", { assets: [filename] }, mockFS(files));

    expect(Object.entries(files)).toEqual([
      [expect.stringContaining(filename), content],
      [expect.stringMatching(`dist[/\\\\]assets[/\\\\]test$`), mkdirOptions],
      [
        expect.stringMatching(
          `dist[/\\\\]assets[/\\\\]test[/\\\\]${filename}$`
        ),
        content,
      ],
    ]);
  });

  test("copies strings", async () => {
    const filename = "arnolds-greatest-lines.md";
    const content = "all of them";
    const files = { [filename]: content };

    await copyAssets(context, "test", { strings: [filename] }, mockFS(files));

    expect(Object.entries(files)).toEqual([
      [expect.stringContaining(filename), content],
      [expect.stringMatching(`dist[/\\\\]strings[/\\\\]test$`), mkdirOptions],
      [
        expect.stringMatching(
          `dist[/\\\\]strings[/\\\\]test[/\\\\]${filename}$`
        ),
        content,
      ],
    ]);
  });

  test("copies Xcode asset catalogs", async () => {
    const filename = "arnolds-greatest-assets.xcassets";
    const content = "all of them";
    const files = { [filename]: content };

    await copyAssets(context, "test", { xcassets: [filename] }, mockFS(files));

    expect(Object.entries(files)).toEqual([
      [expect.stringContaining(filename), content],
      ["xcassets", mkdirOptions],
      [expect.stringMatching(`xcassets[/\\\\]${filename}$`), content],
    ]);
  });

  test("does not copy Xcode asset catalogs if destination path is unset", async () => {
    const filename = "arnolds-greatest-assets.xcassets";
    const content = "all of them";
    const files = { [filename]: content };

    await copyAssets(
      { ...context, options: { ...options, xcassetsDest: undefined } },
      "test",
      { xcassets: [filename] },
      mockFS(files)
    );

    expect(Object.entries(files)).toEqual([
      [expect.stringContaining(filename), content],
    ]);
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
