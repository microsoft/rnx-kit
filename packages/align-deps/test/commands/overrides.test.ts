import { deepEqual, equal, fail, ok } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  checkPackageManifest,
  makeCheckCommand,
} from "../../src/commands/check.ts";
import {
  checkOverrides,
  collectManagedDependencies,
  findOverrides,
  makeOverridesChecker,
  packageNameOf,
  versionRangeOf,
} from "../../src/commands/overrides.ts";
import type { ManagedDependencies } from "../../src/commands/overrides.ts";
import { defaultConfig, loadConfig } from "../../src/config.ts";
import { profile as profile_0_70 } from "../../src/presets/microsoft/react-native/profile-0.70.ts";
import { profile as profile_0_71 } from "../../src/presets/microsoft/react-native/profile-0.71.ts";
import type { Reporter } from "../../src/reporter.ts";
import type { Options } from "../../src/types.ts";
import * as mockfs from "../__mocks__/fs.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const fs = mockfs as unknown as typeof import("node:fs");

const defaultOptions: Options = {
  presets: defaultConfig.presets,
  checkOverrides: true,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: false,
  requirements: ["react-native@0.70"],
};

function makeReporter(): Reporter & { warnings: string[] } {
  const warnings: string[] = [];
  return {
    warnings,
    info: fail,
    warn: (message: string) => warnings.push(message),
    error: fail,
    close: fail,
  };
}

describe("findOverrides()", () => {
  it("returns nothing when there are no overrides", () => {
    deepEqual(findOverrides({ name: "test", version: "1.0.0" }), []);
  });

  it("finds Yarn resolutions", () => {
    const resolutions = {
      react: "18.1.0",
      "**/@types/react": "^18.0.0",
      "@rnx-kit/align-deps": "^4.0.0",
      "some-package/react-native@^0.70.0": "0.70.6",
    };
    const manifest = {
      name: "test",
      version: "1.0.0",
      resolutions,
    };

    deepEqual(
      findOverrides(manifest).map(({ name, version }) => [name, version]),
      [
        ["react", resolutions.react],
        ["@types/react", resolutions["**/@types/react"]],
        ["@rnx-kit/align-deps", resolutions["@rnx-kit/align-deps"]],
        ["react-native", resolutions["some-package/react-native@^0.70.0"]],
      ]
    );
  });

  it("finds npm overrides, including nested ones", () => {
    const overrides = {
      "react@18.x": "18.1.0",
      "some-package": {
        ".": "1.0.0",
        "react-native": "0.70.6",
      },
    };
    const manifest = {
      name: "test",
      version: "1.0.0",
      overrides,
    };

    deepEqual(
      findOverrides(manifest).map(({ name, version }) => [name, version]),
      [
        ["react", overrides["react@18.x"]],
        ["some-package", overrides["some-package"]["."]],
        ["react-native", overrides["some-package"]["react-native"]],
      ]
    );
  });

  it("returns entries using unsupported protocols", () => {
    const manifest = {
      name: "test",
      version: "1.0.0",
      resolutions: {
        alias: "npm:preact@^10.0.0",
        patch: "patch:react-native@^0.70.0#./rn.patch",
        workspace: "workspace:*",
        reference: "$react",
        file: "file:./vendor/react",
        git: "github:facebook/react#main",
        url: "https://example.com/react.tgz",
      },
    };

    // Unsupported entries are still returned; they are dropped later, when we
    // fail to determine what version they resolve to.
    deepEqual(
      findOverrides(manifest).map(({ name, version }) => [
        name,
        versionRangeOf(name, version),
      ]),
      [
        ["alias", undefined],
        ["patch", undefined],
        ["workspace", undefined],
        ["reference", undefined],
        ["file", undefined],
        ["git", undefined],
        ["url", undefined],
      ]
    );
  });

  it("finds entries whose key includes a protocol", () => {
    const manifest = {
      name: "test",
      version: "1.0.0",
      resolutions: {
        "react-native@npm:^0.70.0": "0.70.6",
        "@types/react@npm:^18.0.0": "18.0.28",
        "some-package/react@npm:^18.0.0": "18.1.0",
      },
    };

    deepEqual(
      findOverrides(manifest).map(({ name, version }) => [name, version]),
      [
        ["react-native", "0.70.6"],
        ["@types/react", "18.0.28"],
        ["react", "18.1.0"],
      ]
    );
  });
});

describe("packageNameOf()", () => {
  it("returns the name of unscoped packages", () => {
    equal(packageNameOf("react"), "react");
    equal(packageNameOf("react-native"), "react-native");
  });

  it("returns the name of scoped packages", () => {
    equal(packageNameOf("@types/react"), "@types/react");
    equal(
      packageNameOf("@react-native/metro-config"),
      "@react-native/metro-config"
    );
  });

  it("strips version descriptors", () => {
    equal(packageNameOf("react@18.2.0"), "react");
    equal(packageNameOf("react@^18"), "react");
    equal(packageNameOf("@types/react@18.2.0"), "@types/react");
  });

  it("returns the last segment of nested keys", () => {
    equal(packageNameOf("**/react"), "react");
    equal(packageNameOf("**/@types/react"), "@types/react");
    equal(packageNameOf("react-native/react"), "react");
    equal(packageNameOf("a/b/c/react"), "react");
  });

  it("returns the last segment of nested keys with version descriptors", () => {
    equal(packageNameOf("**/react@^18"), "react");
    equal(packageNameOf("parent/@types/react@18.2.0"), "@types/react");
  });

  it("returns nothing when there is no name to extract", () => {
    equal(packageNameOf(""), undefined);
    equal(packageNameOf("react/"), undefined);
    equal(packageNameOf("@types/"), undefined);
    equal(packageNameOf("**/"), undefined);
  });

  it("returns nothing when the version descriptor is empty", () => {
    equal(packageNameOf("react@"), undefined);
    equal(packageNameOf("**/react@"), undefined);
    equal(packageNameOf("@types/react@"), undefined);
  });

  it("ignores preceding segments that are not scopes", () => {
    equal(packageNameOf("@/react"), "react");
    equal(packageNameOf("@a@b/react"), "react");
    equal(packageNameOf("parent/react"), "react");
  });
});

describe("checkOverrides()", () => {
  const managed: ManagedDependencies = new Map([
    ["react", ["18.1.0"]],
    ["react-native", ["^0.70.0"]],
  ]);

  it("warns when an override is outside the managed range", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "0.71.0",
      },
    ];

    checkOverrides(resolutions, "package.json", managed, reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`resolutions["react-native"]`));
    ok(reporter.warnings[0].endsWith("^0.70.0"));
  });

  it("warns when an override is broader than the managed range", () => {
    const reporter = makeReporter();
    const overrides = [
      {
        section: "overrides",
        key: "react",
        name: "react",
        version: "^18.1.0",
      },
    ];

    checkOverrides(overrides, "package.json", managed, reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`overrides["react"]`));
    ok(reporter.warnings[0].endsWith("18.1.0"));
  });

  it("accepts concrete versions within the managed range", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "0.70.6",
      },
      {
        section: "resolutions",
        key: "react",
        name: "react",
        version: "18.1.0",
      },
    ];

    checkOverrides(resolutions, "package.json", managed, reporter);

    equal(reporter.warnings.length, 0);
  });

  it("ignores unmanaged packages and unsupported protocols", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "some-package",
        name: "some-package",
        version: "0.0.1",
      },
      {
        section: "resolutions",
        key: "react",
        name: "react",
        version: "npm:preact@^10.0.0",
      },
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "patch:react-native@^0.70.0#./rn.patch",
      },
    ];

    checkOverrides(resolutions, "package.json", managed, reporter);

    equal(reporter.warnings.length, 0);
  });

  it("accepts entries using the default `npm:` protocol", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "react",
        name: "react",
        version: "npm:react@18.1.0",
      },
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "npm:0.70.6",
      },
    ];

    checkOverrides(resolutions, "package.json", managed, reporter);

    equal(reporter.warnings.length, 0);
  });

  it("warns when an entry using the default `npm:` protocol is misaligned", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "npm:react-native@0.71.0",
      },
    ];

    checkOverrides(resolutions, "package.json", managed, reporter);

    equal(reporter.warnings.length, 1);
    ok(
      reporter.warnings[0].includes(
        `resolutions["react-native"]: "npm:react-native@0.71.0"`
      )
    );
  });

  it("ignores overrides when nothing is managed", () => {
    const reporter = makeReporter();
    const resolutions = [
      {
        section: "resolutions",
        key: "react-native",
        name: "react-native",
        version: "0.71.0",
      },
    ];

    checkOverrides(resolutions, "package.json", new Map(), reporter);

    equal(reporter.warnings.length, 0);
  });
});

describe("versionRangeOf()", () => {
  it("returns plain version ranges as-is", () => {
    equal(versionRangeOf("react-native", "^0.70.0"), "^0.70.0");
    equal(versionRangeOf("react-native", "0.70.6"), "0.70.6");
  });

  it("strips the default `npm:` protocol", () => {
    equal(versionRangeOf("react-native", "npm:^0.70.0"), "^0.70.0");
    equal(
      versionRangeOf("react-native", "npm:react-native@^0.70.0"),
      "^0.70.0"
    );
    equal(
      versionRangeOf("@types/react", "npm:@types/react@^18.0.0"),
      "^18.0.0"
    );
  });

  it("returns nothing for aliases of other packages", () => {
    equal(versionRangeOf("react", "npm:preact@^10.0.0"), undefined);
    equal(versionRangeOf("react", "npm:preact"), undefined);
    equal(versionRangeOf("react", "npm:preact@latest"), undefined);
    equal(versionRangeOf("react", "npm:react@latest"), undefined);
  });

  it("returns nothing for unsupported protocols", () => {
    equal(
      versionRangeOf("react-native", "patch:react-native@^0.70.0#./rn.patch"),
      undefined
    );
    equal(versionRangeOf("react-native", "workspace:*"), undefined);
    equal(versionRangeOf("react", "$react"), undefined);
  });
});

describe("collectManagedDependencies()", () => {
  it("gathers versions from all profiles in the preset", () => {
    const managed = collectManagedDependencies({
      "0.70": profile_0_70,
      "0.71": profile_0_71,
    });

    deepEqual(managed.get("react-native"), ["^0.70.0", "^0.71.0"]);
    deepEqual(managed.get("react"), ["18.1.0", "18.2.0"]);
  });

  it("gathers packages that no capability in the workspace provides", () => {
    const managed = collectManagedDependencies({ "0.70": profile_0_70 });

    // `core` only resolves to `react-native`, but the profile manages more
    ok(managed.size > 2);
    deepEqual(managed.get("react-dom"), ["^18.1.0"]);
    deepEqual(managed.get("metro"), ["^0.72.1"]);
  });

  it("skips meta packages", () => {
    const managed = collectManagedDependencies({ "0.70": profile_0_70 });

    equal(managed.get("#meta"), undefined);
  });

  it("returns nothing for an empty preset", () => {
    equal(collectManagedDependencies({}).size, 0);
  });
});

describe("makeOverridesChecker()", () => {
  const presets = defaultConfig.presets;

  const enabled: Options = {
    presets,
    checkOverrides: true,
    requirements: ["react-native@0.70"],
  };

  function makeChecker(options: Options) {
    const check = makeOverridesChecker(options, fs);
    ok(check);
    return check;
  }

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
    mockfs.__setMockContent({});
  });

  it("is disabled unless `--check-overrides` is specified", () => {
    equal(makeOverridesChecker({ presets }), undefined);
    equal(makeOverridesChecker({ presets, checkOverrides: false }), undefined);
  });

  it("is skipped when there are neither requirements nor a configuration", () => {
    const check = makeChecker({ presets, checkOverrides: true });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes("skipping"));
  });

  it("prefers the package configuration declaring the overrides", () => {
    const check = makeChecker({
      presets,
      checkOverrides: true,
      requirements: ["react-native@0.71"],
    });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@0.70"],
          capabilities: ["core"],
        },
      },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`resolutions["react-native"]`));
    ok(reporter.warnings[0].endsWith("^0.70.0"));
  });

  it("accepts pins matching the development requirements", () => {
    const check = makeChecker({ presets, checkOverrides: true });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
      "rnx-kit": {
        alignDeps: {
          requirements: {
            development: ["react-native@0.71"],
            production: ["react-native@0.70"],
          },
          capabilities: ["core"],
        },
      },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 0);
  });

  it("falls back to a legacy configuration", (t) => {
    t.mock.method(console, "warn", () => undefined);

    const check = makeChecker({ presets, checkOverrides: true });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
      "rnx-kit": {
        reactNativeVersion: "^0.70.0",
        capabilities: ["core"],
      },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`resolutions["react-native"]`));
    ok(reporter.warnings[0].endsWith("^0.70.0"));
  });

  it("scopes managed versions to the profiles satisfying the requirements", () => {
    const check = makeChecker(enabled);

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0", react: "18.1.0" },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`resolutions["react-native"]`));
  });

  it("accepts pins matching any profile satisfying the requirements", () => {
    const check = makeChecker({
      ...enabled,
      requirements: ["react-native@>=0.70 <0.72"],
    });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 0);
  });

  it("checks the workspace root even if it is unconfigured", () => {
    const check = makeChecker(enabled);

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.86.0" },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 1);
    ok(reporter.warnings[0].includes(`resolutions["react-native"]`));
  });

  it("does nothing when no profile satisfies the requirements", () => {
    const check = makeChecker({
      ...enabled,
      requirements: ["react-native@0.0.1"],
    });

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      resolutions: { "react-native": "0.71.0" },
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 0);
  });

  it("does nothing when the root declares no overrides", () => {
    const check = makeChecker(enabled);

    mockfs.__setMockContent({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
    });

    const reporter = makeReporter();
    check("package.json", reporter);

    equal(reporter.warnings.length, 0);
  });
});

describe("makeCheckCommand() with `--check-overrides`", () => {
  const manifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
    dependencies: { react: "18.1.0", "react-native": "^0.70.0" },
    resolutions: { "react-native": "0.71.0" },
    "rnx-kit": {
      kitType: "app" as const,
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core"],
      },
    },
  };

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
    mockfs.__setMockContent({});
    mockfs.__setMockFileWriter(() => undefined);
  });

  it("does not add a finalize step when `--check-overrides` is unspecified", () => {
    const uncheckedCommand = makeCheckCommand({
      ...defaultOptions,
      checkOverrides: false,
    });

    ok(!uncheckedCommand.isRootCommand);
    equal(uncheckedCommand.finalize, undefined);
  });

  it("adds a finalize step when `--check-overrides` is specified", () => {
    const command = makeCheckCommand(defaultOptions);

    ok(!command.isRootCommand);
    equal(typeof command.finalize, "function");
  });

  it("never rewrites overrides, not even with `--write`", () => {
    mockfs.__setMockContent({
      ...manifest,
      dependencies: { react: "18.1.0", "react-native": "^0.69.0" },
    });

    let updatedManifest = "";
    mockfs.__setMockFileWriter((_, content) => {
      updatedManifest = content.toString();
    });

    const options = { ...defaultOptions, write: true };
    const result = checkPackageManifest(
      "package.json",
      options,
      loadConfig("package.json", options, fs),
      undefined,
      fs
    );

    equal(result, "success");

    const written = JSON.parse(updatedManifest);

    deepEqual(written.resolutions, manifest.resolutions);
    equal(written.dependencies["react-native"], "^0.70.0");
  });
});
