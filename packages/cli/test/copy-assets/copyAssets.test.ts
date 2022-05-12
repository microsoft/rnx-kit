import * as path from "path";
import { findFiles, mockFiles } from "./helpers";
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
};

describe("copyAssets", () => {
  afterEach(() => {
    mockFiles();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns early if there is nothing to copy", async () => {
    await copyAssets(context, "test", {});
    expect(findFiles()).toEqual([]);
  });

  test("copies assets", async () => {
    const filename = "arnolds-greatest-movies.md";
    const content = "all of them";
    mockFiles({ [filename]: content });

    await copyAssets(context, "test", { assets: [filename] });

    expect(findFiles()).toEqual([
      [expect.stringContaining(filename), content],
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
    mockFiles({ [filename]: content });

    await copyAssets(context, "test", { strings: [filename] });

    expect(findFiles()).toEqual([
      [expect.stringContaining(filename), content],
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
    mockFiles({ [filename]: content });

    await copyAssets(context, "test", { xcassets: [filename] });

    expect(findFiles()).toEqual([
      [expect.stringContaining(filename), content],
      [expect.stringMatching(`xcassets[/\\\\]${filename}$`), content],
    ]);
  });

  test("does not copy Xcode asset catalogs if destination path is unset", async () => {
    const filename = "arnolds-greatest-assets.xcassets";
    const content = "all of them";
    mockFiles({ [filename]: content });

    await copyAssets(
      { ...context, options: { ...options, xcassetsDest: undefined } },
      "test",
      { xcassets: [filename] }
    );

    expect(findFiles()).toEqual([[expect.stringContaining(filename), content]]);
  });
});

describe("gatherConfigs", () => {
  test("returns early if there is nothing to copy", async () => {
    expect(await gatherConfigs(context)).toBeUndefined();
  });
});

describe("versionOf", () => {
  test("returns the version of specified package", () => {
    expect(versionOf("@rnx-kit/tools-node")).toMatch(/^\d+[.\d]+$/);
  });

  test("throws if package is not installed", () => {
    expect(() => versionOf("some-package-that-does-not-exist")).toThrow();
  });
});
