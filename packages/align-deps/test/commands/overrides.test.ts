import { deepEqual, equal } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  checkOverrides,
  collectManagedPackages,
  collectOverrides,
  findOverrideViolations,
} from "../../src/commands/overrides.ts";
import { defaultConfig } from "../../src/config.ts";
import type { Options } from "../../src/types.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const defaultOptions: Options = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: false,
  diffMode: "strict",
};

/**
 * Builds a minimal `fs` mock that serves the specified manifests by path.
 */
function mockFS(files: Record<string, unknown>) {
  const contents: Record<string, string> = {};
  for (const [p, manifest] of Object.entries(files)) {
    contents[p] = JSON.stringify(manifest);
  }
  return {
    existsSync: (p: string) => p in contents,
    readFileSync: (p: string) => {
      if (p in contents) {
        return contents[p];
      }
      throw new Error(`ENOENT: ${p}`);
    },
    writeFileSync: () => {
      throw new Error("writeFileSync should not be called");
    },
  } as unknown as typeof import("node:fs");
}

function appManifest(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    version: "1.0.0",
    "rnx-kit": {
      kitType: "app",
      alignDeps: {
        requirements: ["react-native@0.74"],
        capabilities: ["core-ios"],
      },
    },
    ...extra,
  };
}

describe("collectOverrides()", () => {
  it("collects Yarn resolutions", () => {
    const overrides = collectOverrides({
      name: "test",
      version: "1.0.0",
      resolutions: {
        "react-native": "0.74.5",
        "some-lib/@babel/core": "^7.0.0",
        "parent/lodash@^1.0.0": "1.2.3",
      },
    });

    deepEqual(overrides, [
      { field: "resolutions", name: "react-native", version: "0.74.5" },
      { field: "resolutions", name: "@babel/core", version: "^7.0.0" },
      { field: "resolutions", name: "lodash", version: "1.2.3" },
    ]);
  });

  it("collects npm overrides, including nested entries", () => {
    const overrides = collectOverrides({
      name: "test",
      version: "1.0.0",
      overrides: {
        "react-native": "0.74.5",
        foo: {
          ".": "1.0.0",
          bar: "2.0.0",
        },
      },
    });

    deepEqual(overrides, [
      { field: "overrides", name: "react-native", version: "0.74.5" },
      { field: "overrides", name: "foo", version: "1.0.0" },
      { field: "overrides", name: "bar", version: "2.0.0" },
    ]);
  });

  it("ignores references to other dependencies", () => {
    const overrides = collectOverrides({
      name: "test",
      version: "1.0.0",
      resolutions: { "react-native": "$react-native" },
      overrides: { react: "$react" },
    });

    deepEqual(overrides, []);
  });
});

describe("findOverrideViolations()", () => {
  const managed = new Map([
    ["react-native", ["^0.74.0"]],
    ["react", ["18.2.0"]],
  ]);

  it("flags overrides pinned outside the managed range", () => {
    const violations = findOverrideViolations(managed, {
      name: "test",
      version: "1.0.0",
      resolutions: { "react-native": "0.73.6" },
    });

    deepEqual(violations, [
      {
        field: "resolutions",
        name: "react-native",
        version: "0.73.6",
        expected: "^0.74.0",
      },
    ]);
  });

  it("does not flag concrete versions within the managed range", () => {
    const violations = findOverrideViolations(managed, {
      name: "test",
      version: "1.0.0",
      resolutions: { "react-native": "0.74.5" },
    });

    deepEqual(violations, []);
  });

  it("flags ranges broader than the managed range", () => {
    const violations = findOverrideViolations(managed, {
      name: "test",
      version: "1.0.0",
      overrides: { "react-native": "*" },
    });

    equal(violations.length, 1);
    equal(violations[0].name, "react-native");
  });

  it("ignores overrides for unmanaged packages", () => {
    const violations = findOverrideViolations(managed, {
      name: "test",
      version: "1.0.0",
      resolutions: { "some-random-lib": "1.0.0" },
    });

    deepEqual(violations, []);
  });
});

describe("collectManagedPackages()", () => {
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("resolves managed packages across configured packages", () => {
    const fs = mockFS({
      "packages/app/package.json": appManifest("app"),
    });

    const managed = collectManagedPackages(
      ["packages/app/package.json"],
      defaultOptions,
      fs
    );

    equal(managed.get("react-native")?.join(" || "), "^0.74.0");
    equal(managed.get("react")?.join(" || "), "18.2.0");
  });

  it("considers both production and development profiles", () => {
    const fs = mockFS({
      "packages/lib/package.json": {
        name: "lib",
        version: "1.0.0",
        "rnx-kit": {
          kitType: "library",
          alignDeps: {
            requirements: {
              development: ["react-native@0.74"],
              production: ["react-native@0.73"],
            },
            capabilities: ["core"],
          },
        },
      },
    });

    const managed = collectManagedPackages(
      ["packages/lib/package.json"],
      defaultOptions,
      fs
    );

    deepEqual(managed.get("react-native")?.sort(), ["^0.73.0", "^0.74.0"]);
  });

  it("returns an empty map when nothing is configured", () => {
    const fs = mockFS({
      "package.json": { name: "root", version: "1.0.0" },
    });

    const managed = collectManagedPackages(
      ["package.json"],
      defaultOptions,
      fs
    );

    equal(managed.size, 0);
  });

  it("skips packages whose requirements cannot be resolved", () => {
    const fs = mockFS({
      "packages/app/package.json": {
        name: "app",
        version: "1.0.0",
        "rnx-kit": {
          kitType: "app",
          alignDeps: {
            requirements: ["react-native@99.0"],
            capabilities: ["core-ios"],
          },
        },
      },
    });

    const managed = collectManagedPackages(
      ["packages/app/package.json"],
      defaultOptions,
      fs
    );

    equal(managed.size, 0);
  });
});

describe("checkOverrides()", () => {
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  function collectWarnings() {
    const warnings: string[] = [];
    const makeReporter = () => ({
      info: () => undefined,
      warn: (message: string) => warnings.push(message),
      error: () => undefined,
      close: () => undefined,
    });
    return { warnings, makeReporter };
  }

  it("warns about a misaligned override", () => {
    const fs = mockFS({
      "packages/app/package.json": appManifest("app", {
        resolutions: { "react-native": "0.73.6" },
      }),
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(
      ["packages/app/package.json"],
      defaultOptions,
      fs,
      makeReporter
    );

    equal(warnings.length, 1);
    equal(warnings[0].includes("react-native"), true);
  });

  it("does not warn about a concrete version within the profile (strict)", () => {
    const fs = mockFS({
      "packages/app/package.json": appManifest("app", {
        resolutions: { "react-native": "0.74.5" },
      }),
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(
      ["packages/app/package.json"],
      { ...defaultOptions, diffMode: "strict" },
      fs,
      makeReporter
    );

    equal(warnings.length, 0);
  });

  it("accepts an override that only matches the development profile", () => {
    const fs = mockFS({
      "packages/lib/package.json": {
        name: "lib",
        version: "1.0.0",
        "rnx-kit": {
          kitType: "library",
          alignDeps: {
            requirements: {
              development: ["react-native@0.74"],
              production: ["react-native@0.73"],
            },
            capabilities: ["core"],
          },
        },
        resolutions: { "react-native": "0.74.5" },
      },
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(
      ["packages/lib/package.json"],
      defaultOptions,
      fs,
      makeReporter
    );

    equal(warnings.length, 0);
  });

  it("checks overrides declared in a config-less workspace root", () => {
    const fs = mockFS({
      "packages/app/package.json": appManifest("app"),
      "package.json": {
        name: "root",
        version: "1.0.0",
        private: true,
        resolutions: { "react-native": "0.73.6" },
      },
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(
      ["packages/app/package.json", "package.json"],
      defaultOptions,
      fs,
      makeReporter
    );

    equal(warnings.length, 1);
    equal(warnings[0].startsWith("package.json:"), true);
  });

  it("does not warn when there is nothing to compare against", () => {
    const fs = mockFS({
      "package.json": {
        name: "root",
        version: "1.0.0",
        resolutions: { "react-native": "0.73.6" },
      },
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(["package.json"], defaultOptions, fs, makeReporter);

    equal(warnings.length, 0);
  });

  it("never rewrites overrides, even with `--write`", () => {
    const original = {
      ...appManifest("app"),
      resolutions: { "react-native": "0.73.6" },
    };
    const fs = mockFS({
      "packages/app/package.json": original,
    });
    const { warnings, makeReporter } = collectWarnings();

    checkOverrides(
      ["packages/app/package.json"],
      { ...defaultOptions, write: true },
      fs,
      makeReporter
    );

    // A warning is emitted, but `writeFileSync` would have thrown if called.
    equal(warnings.length, 1);
    deepEqual(original.resolutions, { "react-native": "0.73.6" });
  });
});
