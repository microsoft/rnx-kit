import { deepEqual, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { getKitConfig } from "../src/getKitConfig";

describe("getKitConfig()", () => {
  const currentWorkingDir = process.cwd();

  function packagePath(name: string): string {
    const url = new URL(`__fixtures__/node_modules/${name}`, import.meta.url);
    return fileURLToPath(url);
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
    const options = { module: "kit-test-unconfigured", cwd: packagePath(".") };
    ok(!getKitConfig(options));
  });

  it("returns rnx-kit configuration when using the current working directory", () => {
    process.chdir(packagePath("kit-test-configured"));

    deepEqual(getKitConfig(), {
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
    });
  });

  it("returns rnx-kit configuration when using an explicit working directory", () => {
    deepEqual(getKitConfig({ cwd: packagePath("kit-test-configured") }), {
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
    });
  });

  it("returns rnx-kit configuration when using a module name", () => {
    const options = { module: "kit-test-configured", cwd: packagePath(".") };
    deepEqual(getKitConfig(options), {
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
    });
  });
});
