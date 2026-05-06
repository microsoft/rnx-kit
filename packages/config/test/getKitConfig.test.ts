import { deepEqual, ok } from "node:assert/strict";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import type { GetKitConfigOptions } from "../src/getKitConfig.ts";
import { getKitConfig } from "../src/getKitConfig.ts";

describe("getKitConfig()", () => {
  const baseConfig = {
    bundle: {
      bundleOutput: "./app.bundle",
      entryFile: "./core-entry.js",
      id: "core",
      platforms: {
        android: {
          assetsDest: "./build-out/res",
        },
      },
      targets: ["ios", "android", "macos", "windows"],
    },
  };

  const currentWorkingDir = process.cwd();

  function packagePath(name: string): string {
    const url = new URL(`__fixtures__/node_modules/${name}`, import.meta.url);
    return fileURLToPath(url);
  }

  function optionsFor(fixture: string): Required<GetKitConfigOptions> {
    return { module: fixture, cwd: packagePath(".") };
  }

  before(() => {
    global.require = createRequire(path.dirname(path.dirname(import.meta.url)));
  });

  afterEach(() => process.chdir(currentWorkingDir));

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  it("returns undefined for an unconfigured package when using the current working directory", () => {
    process.chdir(packagePath("kit-test-unconfigured"));

    ok(!getKitConfig());
  });

  it("returns undefined for an unconfigured package when using an explicit working directory", () => {
    ok(!getKitConfig({ cwd: packagePath("kit-test-unconfigured") }));
  });

  it("returns undefined for an unconfigured package when using a module name", () => {
    ok(!getKitConfig(optionsFor("kit-test-unconfigured")));
  });

  it("returns configuration when using the current working directory", () => {
    process.chdir(packagePath("kit-test-configured"));

    deepEqual(getKitConfig(), baseConfig);
  });

  it("returns configuration when using an explicit working directory", () => {
    deepEqual(
      getKitConfig({ cwd: packagePath("kit-test-configured") }),
      baseConfig
    );
  });

  it("returns configuration when using a module name", () => {
    deepEqual(getKitConfig(optionsFor("kit-test-configured")), baseConfig);
  });

  it("merges with base config from file", () => {
    deepEqual(getKitConfig(optionsFor("kit-test-extends-file")), baseConfig);
  });

  it("merges with base config from module", () => {
    deepEqual(getKitConfig(optionsFor("kit-test-extends-module")), baseConfig);
  });

  it("does not leak overrides between packages sharing the same base", () => {
    // Regression: `lodash.merge` mutates its target, and both branches of
    // `loadBaseConfig` (`require.cache` for JS files, package-info cache for
    // package.json refs) hand back a cached reference. Without a clone, the
    // first consumer's overrides poison the cached base for every consumer
    // that follows.
    const a = getKitConfig(optionsFor("kit-test-extends-shared-a"));
    const b = getKitConfig(optionsFor("kit-test-extends-shared-b"));

    ok(a, "consumer a should resolve a config");
    ok(b, "consumer b should resolve a config");

    // Sanity: both consumers see the shared base values.
    deepEqual(a.kitType, "library");
    deepEqual(b.kitType, "library");

    // a declares its own bundle; b does not.
    deepEqual(a.bundle, { id: "bundle-a" });
    ok(
      !("bundle" in b),
      "consumer b must not see consumer a's bundle override"
    );
  });

  it("recursively resolves extends through chained JS files", () => {
    // Regression: the JS-file branch of `loadBaseConfig` used to call
    // `require(spec)` and stop, so a JS preset that itself declared `extends`
    // had its own base silently dropped.
    const config = getKitConfig(optionsFor("kit-test-extends-chain"));
    ok(config, "chained config should resolve");

    // Values from the root layer.
    deepEqual(config.kitType, "library");
    // Values from the mid layer.
    deepEqual(config.bundle, { id: "mid-bundle" });
    // The merged config should not carry an `extends` field forward.
    ok(!("extends" in config), "extends should be stripped from merged config");
  });
});
