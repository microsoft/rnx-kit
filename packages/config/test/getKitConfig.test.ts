import { deepEqual, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import type { GetKitConfigOptions } from "../src/getKitConfig";
import { getKitConfig } from "../src/getKitConfig";

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

  function optionsFor(fixture: string): GetKitConfigOptions {
    return { module: fixture, cwd: packagePath(".") };
  }

  afterEach(() => process.chdir(currentWorkingDir));

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
});
