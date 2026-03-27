import { ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { bundle } from "../src/bundle.ts";
import { inferBuildTarget } from "../src/targets.ts";
import { reactNativeResolver } from "../src/plugins/resolver.ts";

const fixturesDir = fileURLToPath(new URL("./__fixtures__", import.meta.url));

// Use a modern Hermes target so tests don't fail due to unsupported lowering
// (e.g. const/let are not supported in very early Hermes targets).
const TEST_TARGET = "hermes0.12";

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rnx-esbuild-service-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("inferBuildTarget", () => {
  it("returns a hermes target string", () => {
    const target = inferBuildTarget();
    ok(
      typeof target === "string" && target.startsWith("hermes"),
      `Expected hermes target, got: ${target}`
    );
  });
});

describe("bundle", () => {
  it("bundles a TypeScript entry file", async () => {
    const output = path.join(tmpDir, "bundle-ts.js");
    await bundle({
      entryFile: path.join(fixturesDir, "entry.ts"),
      platform: "ios",
      dev: false,
      minify: false,
      bundleOutput: output,
      target: TEST_TARGET,
    });
    ok(fs.existsSync(output), "bundle output file should exist");
    const code = fs.readFileSync(output, "utf-8");
    ok(code.length > 0, "bundle should not be empty");
    ok(code.includes("add"), "bundle should include the `add` function");
  });

  it("injects the global variable setup", async () => {
    const output = path.join(tmpDir, "bundle-global.js");
    await bundle({
      entryFile: path.join(fixturesDir, "entry.ts"),
      platform: "ios",
      dev: true,
      minify: false,
      bundleOutput: output,
      target: TEST_TARGET,
    });
    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes("globalThis") || code.includes("global"),
      "bundle should reference globalThis or global"
    );
  });

  it("writes a source map when sourcemapOutput is provided", async () => {
    const output = path.join(tmpDir, "bundle-map.js");
    const mapOutput = path.join(tmpDir, "bundle-map.js.map");
    await bundle({
      entryFile: path.join(fixturesDir, "entry.ts"),
      platform: "ios",
      dev: false,
      minify: false,
      bundleOutput: output,
      sourcemapOutput: mapOutput,
      target: TEST_TARGET,
    });
    ok(fs.existsSync(output), "bundle output file should exist");
    ok(fs.existsSync(mapOutput), "source map file should exist");
    const map = JSON.parse(fs.readFileSync(mapOutput, "utf-8"));
    ok(Array.isArray(map.sources), "source map should have sources array");
  });

  it("tree-shakes unused exports", async () => {
    const output = path.join(tmpDir, "bundle-treeshake.js");
    await bundle({
      entryFile: path.join(fixturesDir, "entry.ts"),
      platform: "ios",
      dev: false,
      minify: false,
      bundleOutput: output,
      target: TEST_TARGET,
    });
    const code = fs.readFileSync(output, "utf-8");
    ok(
      !code.includes("this should be removed by tree-shaking"),
      "bundle should not contain unused function body"
    );
  });
});

describe("reactNativeResolver plugin", () => {
  it("resolves platform-specific files for ios", async () => {
    const output = path.join(tmpDir, "bundle-resolver-ios.js");
    const esbuild = await import("esbuild");
    const buildResult = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "platformEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [reactNativeResolver("ios")],
    });
    ok(buildResult.errors.length === 0, "build should have no errors");
    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes("Hello from iOS!"),
      "bundle should use the iOS platform file"
    );
    ok(
      !code.includes("Hello from Android!"),
      "bundle should NOT use the Android platform file"
    );
  });

  it("resolves platform-specific files for android", async () => {
    const output = path.join(tmpDir, "bundle-resolver-android.js");
    const esbuild = await import("esbuild");
    const buildResult = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "platformEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [reactNativeResolver("android")],
    });
    ok(buildResult.errors.length === 0, "build should have no errors");
    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes("Hello from Android!"),
      "bundle should use the Android platform file"
    );
    ok(
      !code.includes("Hello from iOS!"),
      "bundle should NOT use the iOS platform file"
    );
  });

  it("falls back to .native extension when platform file is absent", async () => {
    const output = path.join(tmpDir, "bundle-resolver-macos.js");
    const esbuild = await import("esbuild");
    const buildResult = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(fixturesDir, "platformEntry.ts")],
      outfile: output,
      write: true,
      logLevel: "silent",
      plugins: [reactNativeResolver("macos")],
    });
    ok(buildResult.errors.length === 0, "build should have no errors");
    const code = fs.readFileSync(output, "utf-8");
    ok(
      code.includes("Hello from native!"),
      "bundle should fall back to the .native extension"
    );
  });
});
