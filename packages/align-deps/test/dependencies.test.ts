import { readPackage } from "@rnx-kit/tools-node/package";
import type { PackageManifest } from "@rnx-kit/types-node";
import { deepEqual, equal, match, throws } from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { gatherRequirements, visitDependencies } from "../src/dependencies.ts";
import { profile as profile_0_69 } from "../src/presets/microsoft/react-native/profile-0.69.ts";
import { profile as profile_0_70 } from "../src/presets/microsoft/react-native/profile-0.70.ts";

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
}

function useFixture(name: string): [string, PackageManifest] {
  const fixture = fixturePath(name);
  return [fixture, readPackage(fixture)];
}

describe("visitDependencies()", () => {
  const currentWorkingDir = process.cwd();

  afterEach(() => {
    process.chdir(currentWorkingDir);
  });

  it("returns if there are no direct dependencies", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const visited = new Set<string>();

    visitDependencies(
      { name: "@rnx-kit/align-deps", version: "1.0.0" },
      process.cwd(),
      () => 0,
      visited
    );

    equal(visited.size, 0);

    const dependencies = { "react-native": "1000.0.0" };

    visitDependencies(
      {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        peerDependencies: dependencies,
        devDependencies: dependencies,
      },
      process.cwd(),
      () => 0,
      visited
    );

    equal(visited.size, 0);
    equal(warnSpy.mock.callCount(), 0);
  });

  it("traverse transitive dependencies", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const fixture = fixturePath("awesome-repo");
    process.chdir(fixture);

    const visited: string[] = [];
    visitDependencies(
      readPackage(path.join(fixture, "package.json")),
      process.cwd(),
      (module) => {
        visited.push(module);
      }
    );

    deepEqual(visited.sort(), [
      "conan",
      "dutch",
      "john",
      "quaid",
      "react",
      "react-native",
      "t-800",
    ]);
    equal(warnSpy.mock.callCount(), 0);
  });

  it("skips unresolved packages", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const visited: string[] = [];
    visitDependencies(
      {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "this-does-not-exist": "1.0.0",
        },
      },
      process.cwd(),
      (module) => visited.push(module)
    );

    equal(visited.length, 0);
    equal(warnSpy.mock.callCount(), 1);
  });
});

describe("gatherRequirements()", () => {
  const defaultOptions = { loose: false };

  it("gather requirements from all dependencies", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const [fixture, manifest] = useFixture("awesome-repo");
    const initialPreset = { "0.69": profile_0_69, "0.70": profile_0_70 };
    const initialCapabilities = manifest["rnx-kit"]?.capabilities;
    const { preset, capabilities } = gatherRequirements(
      fixture,
      manifest,
      initialPreset,
      ["react-native@0.69 || 0.70"],
      Array.isArray(initialCapabilities) ? initialCapabilities : [],
      defaultOptions
    );

    deepEqual(preset, initialPreset);
    deepEqual(capabilities.sort(), [
      "animation",
      "core-android",
      "hermes",
      "lazy-index",
      "netinfo",
      "storage",
      "webview",
    ]);
    equal(errorSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
  });

  describe("installed dependency identities", () => {
    let directory: string;
    beforeEach(() => {
      const cache = path.join(process.cwd(), "node_modules", ".cache");
      mkdirSync(cache, { recursive: true });
      directory = mkdtempSync(path.join(cache, "rnx-dependency-identities-"));
    });
    afterEach(() => rmSync(directory, { recursive: true, force: true }));

    function writeManifest(
      relative: string,
      manifest: Partial<PackageManifest> = {}
    ) {
      const root = path.join(directory, relative);
      mkdirSync(root, { recursive: true });
      const contents = { name: "root", version: "1.0.0", ...manifest };
      writeFileSync(path.join(root, "package.json"), JSON.stringify(contents));
      return contents;
    }

    it("gathers capabilities and requirements from distinct installed versions", () => {
      const manifest = writeManifest("", {
        dependencies: { shared: "1.0.0", parent: "1.0.0" },
      });
      writeManifest("node_modules/shared", {
        name: "shared",
        "rnx-kit": {
          alignDeps: {
            requirements: ["react-native@0.69 || 0.70"],
            capabilities: ["storage"],
          },
        },
      });
      writeManifest("node_modules/parent", {
        name: "parent",
        dependencies: { shared: "2.0.0" },
      });
      writeManifest("node_modules/parent/node_modules/shared", {
        name: "shared",
        version: "2.0.0",
        "rnx-kit": {
          alignDeps: {
            requirements: ["react-native@0.70"],
            capabilities: ["netinfo"],
          },
        },
      });
      const sources: string[] = [];
      const result = gatherRequirements(
        directory,
        manifest,
        { "0.69": profile_0_69, "0.70": profile_0_70 },
        ["react-native@0.69 || 0.70"],
        ["core-ios"],
        { loose: false },
        (_name, root) => sources.push(root)
      );
      deepEqual(Object.keys(result.preset), ["0.70"]);
      deepEqual(result.capabilities, ["storage", "netinfo", "core-ios"]);
      deepEqual(sources, [
        path.join(directory, "node_modules/shared"),
        path.join(directory, "node_modules/parent/node_modules/shared"),
      ]);
    });

    it("retries an unresolved name from a later dependency's directory", (t) => {
      const warning = t.mock.method(console, "warn", () => undefined);
      const manifest = writeManifest("", {
        dependencies: { missing: "1.0.0", parent: "1.0.0" },
      });
      writeManifest("node_modules/parent", {
        dependencies: { missing: "1.0.0" },
      });
      writeManifest("node_modules/parent/node_modules/missing");
      const names: string[] = [];
      visitDependencies(manifest, directory, (name) => names.push(name));
      deepEqual(names, ["parent", "missing"]);
      equal(warning.mock.callCount(), 1);
      match(
        warning.mock.calls[0].arguments.join(" "),
        /Unable to resolve module 'missing'/
      );
    });

    it("deduplicates aliases and symlinks and seeds root and transitive cycles", () => {
      const manifest = writeManifest("", {
        dependencies: {
          first: "1.0.0",
          alias: "npm:first@1.0.0",
          self: "1.0.0",
        },
      });
      writeManifest("node_modules/first", {
        dependencies: { second: "1.0.0", self: "1.0.0" },
      });
      writeManifest("node_modules/second", {
        dependencies: { alias: "1.0.0" },
      });
      symlinkSync(
        path.join(directory, "node_modules/first"),
        path.join(directory, "node_modules/alias"),
        "junction"
      );
      symlinkSync(
        directory,
        path.join(directory, "node_modules/self"),
        "junction"
      );
      const visited = new Set<string>();
      const names: string[] = [];
      visitDependencies(
        manifest,
        directory,
        (name) => names.push(name),
        visited
      );
      deepEqual(names, ["first", "second"]);
      deepEqual(
        [...visited],
        ["", "node_modules/first", "node_modules/second"].map((relative) =>
          realpathSync(path.join(directory, relative, "package.json"))
        )
      );
    });
  });

  it("gather requirements from all dependencies with custom profiles", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const cyberdyne = { name: "cyberdyne", version: "1.0.0", devOnly: true };
    const skynet = { name: "skynet", version: "1.0.0" };

    const initialPreset = {
      "0.69": {
        ...profile_0_69,
        [cyberdyne.name]: cyberdyne,
        [skynet.name]: skynet,
      },
      "0.70": {
        ...profile_0_70,
        [cyberdyne.name]: cyberdyne,
        [skynet.name]: skynet,
      },
    };

    const [fixture, manifest] = useFixture("awesome-repo-extended");
    const initialCapabilities = manifest["rnx-kit"]?.capabilities;

    const { preset, capabilities } = gatherRequirements(
      fixture,
      manifest,
      initialPreset,
      ["react-native@0.69 || 0.70"],
      Array.isArray(initialCapabilities) ? initialCapabilities : [],
      defaultOptions
    );

    deepEqual(preset, initialPreset);
    deepEqual(capabilities.sort(), [
      "animation",
      "core-android",
      "hermes",
      "lazy-index",
      "netinfo",
      "skynet",
      "storage",
      "webview",
    ]);
    equal(errorSpy.mock.callCount(), 0);
    equal(warnSpy.mock.callCount(), 0);
  });

  it("throws if no profiles can satisfy requirements of dependencies", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");

    throws(
      () =>
        gatherRequirements(
          fixture,
          manifest,
          { "0.70": profile_0_70 },
          ["react-native@0.70"],
          [],
          defaultOptions
        ),
      /No profiles could satisfy all requirements/
    );
    match(
      errorSpy.mock.calls[0].arguments[1],
      /No profiles could satisfy all requirements/
    );
    equal(warnSpy.mock.callCount(), 0);
  });

  it("does not throw if no profiles can satisfy requirement of dependencies in loose mode", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");
    gatherRequirements(
      fixture,
      manifest,
      { "0.70": profile_0_70 },
      ["react-native@0.70"],
      [],
      { loose: true }
    );

    equal(errorSpy.mock.callCount(), 0);
    match(
      warnSpy.mock.calls[0].arguments[1],
      /No profiles could satisfy all requirements/
    );
  });
});
