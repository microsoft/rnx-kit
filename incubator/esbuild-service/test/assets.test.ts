import { ok, match, strictEqual } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { reactNativeAssets } from "../src/plugins/assets.ts";
import { DEFAULT_ASSET_EXTS } from "../src/plugins/assets.ts";

const fixturesDir = fileURLToPath(new URL("./__fixtures__", import.meta.url));

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rnx-assets-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("DEFAULT_ASSET_EXTS", () => {
  it("includes common image formats", () => {
    ok(DEFAULT_ASSET_EXTS.includes("png"), "should include png");
    ok(DEFAULT_ASSET_EXTS.includes("jpg"), "should include jpg");
    ok(DEFAULT_ASSET_EXTS.includes("gif"), "should include gif");
    ok(DEFAULT_ASSET_EXTS.includes("svg"), "should include svg");
  });

  it("includes font formats", () => {
    ok(DEFAULT_ASSET_EXTS.includes("ttf"), "should include ttf");
    ok(DEFAULT_ASSET_EXTS.includes("otf"), "should include otf");
  });

  it("includes audio/video formats", () => {
    ok(DEFAULT_ASSET_EXTS.includes("mp3"), "should include mp3");
    ok(DEFAULT_ASSET_EXTS.includes("mp4"), "should include mp4");
  });
});

describe("reactNativeAssets plugin", () => {
  it("intercepts asset imports and generates registerAsset code", async () => {
    const output = path.join(tmpDir, "asset-bundle.js");
    const esbuild = await import("esbuild");
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
    });

    const buildResult = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "assetEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    ok(buildResult.errors.length === 0, "build should have no errors");
    ok(fs.existsSync(output), "bundle output file should exist");

    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes("registerAsset"),
      "bundle should contain a registerAsset call"
    );
    ok(
      code.includes("__packager_asset"),
      "bundle should contain __packager_asset field"
    );
    ok(
      code.includes("httpServerLocation"),
      "bundle should contain httpServerLocation field"
    );
  });

  it("collects asset data after the build", async () => {
    const output = path.join(tmpDir, "asset-collect.js");
    const esbuild = await import("esbuild");
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
    });

    await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "assetEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    const assets = assetsPlugin.getCollectedAssets();
    strictEqual(assets.length, 1, "should have collected exactly one asset");

    const asset = assets[0];
    strictEqual(asset.name, "icon", "asset name should be 'icon'");
    strictEqual(asset.type, "png", "asset type should be 'png'");
    ok(
      asset.httpServerLocation.includes("assets"),
      "httpServerLocation should contain 'assets'"
    );
  });

  it("discovers scale variants (@2x etc.)", async () => {
    const output = path.join(tmpDir, "asset-scales.js");
    const esbuild = await import("esbuild");
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
    });

    await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "assetEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    const assets = assetsPlugin.getCollectedAssets();
    const asset = assets[0];
    // The fixtures directory has icon.png and icon@2x.png
    ok(asset.scales.length >= 1, "asset should have at least one scale");
    ok(asset.files.length >= 1, "asset should have at least one file path");
  });

  it("uses the specified assetRegistryPath", async () => {
    const output = path.join(tmpDir, "asset-registry.js");
    const esbuild = await import("esbuild");
    const customRegistryPath = "@react-native/assets-registry/registry";
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
      assetRegistryPath: customRegistryPath,
    });

    await esbuild.build({
      bundle: false,
      entryPoints: [path.join(fixturesDir, "icon.png")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes(customRegistryPath),
      "bundle should use the custom registry path"
    );
  });

  it("does not include file paths in the bundle output", async () => {
    const output = path.join(tmpDir, "asset-no-files.js");
    const esbuild = await import("esbuild");
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
    });

    await esbuild.build({
      bundle: false,
      entryPoints: [path.join(fixturesDir, "icon.png")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    const code = fs.readFileSync(output, "utf-8");
    // The 'files' and 'fileSystemLocation' properties should be stripped
    ok(
      !code.includes('"files"'),
      'bundle should not contain the "files" property'
    );
    ok(
      !code.includes('"fileSystemLocation"'),
      'bundle should not contain the "fileSystemLocation" property'
    );
  });

  it("uses custom publicPath", async () => {
    const output = path.join(tmpDir, "asset-publicpath.js");
    const esbuild = await import("esbuild");
    const assetsPlugin = reactNativeAssets({
      platform: "ios",
      projectRoot: fixturesDir,
      publicPath: "/static",
    });

    await esbuild.build({
      bundle: false,
      entryPoints: [path.join(fixturesDir, "icon.png")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [assetsPlugin],
    });

    const code = fs.readFileSync(output, "utf-8");
    match(code, /\/static/, "httpServerLocation should use custom publicPath");
  });
});
