import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  collectWhy,
  makeWhyCommand,
  renderWhy,
} from "../../src/commands/why.ts";
import { mergePresets } from "../../src/preset.ts";
import type { Options } from "../../src/types.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const options: Options = { presets: ["microsoft/react-native"] };
const fixture = fileURLToPath(
  new URL("../__fixtures__/awesome-repo/", import.meta.url)
);

describe("why", () => {
  let directory: string;

  before(() => defineRequire("../../src/preset.ts", import.meta.url));
  after(undefineRequire);
  beforeEach(() => {
    const cache = path.join(process.cwd(), "node_modules", ".cache");
    mkdirSync(cache, { recursive: true });
    directory = mkdtempSync(path.join(cache, "rnx-align-deps-why-"));
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function writeManifest(name: string, manifest: Record<string, unknown>) {
    const root = name ? path.join(directory, "node_modules", name) : directory;
    mkdirSync(root, { recursive: true });
    const filename = path.join(root, "package.json");
    writeFileSync(
      filename,
      JSON.stringify({
        name: name || "root",
        version: "1.0.0",
        ...manifest,
      })
    );
    return filename;
  }

  function configure(
    capabilities = ["bundle"],
    extra: Record<string, unknown> = {},
    profileExtra: Record<string, unknown> = {},
    profileNames = ["first"]
  ) {
    const preset = path.join(directory, "preset.cjs");
    const profile = {
      core: { name: "react-native", version: "0.70.0" },
      bundle: { name: "#meta", capabilities: ["nested", "second"] },
      nested: {
        name: "intermediate",
        version: "1.0.0",
        capabilities: ["target", "bundle"],
      },
      second: { name: "#meta", capabilities: ["target"] },
      target: { name: "@scope/target", version: "1.0.0" },
      "dev-only": { name: "dev-tool", version: "1.0.0", devOnly: true },
      "core-extra": { name: "platform", version: "1.0.0" },
      ...profileExtra,
    };
    writeFileSync(
      preset,
      `module.exports = ${JSON.stringify(Object.fromEntries(profileNames.map((name) => [name, profile])))};`
    );
    const alignDeps = {
      presets: [preset],
      requirements: ["react-native@0.70"],
      capabilities,
    };
    const manifestPath = writeManifest("", {
      "rnx-kit": { alignDeps },
      ...extra,
    });
    return { preset, manifestPath, alignDeps };
  }

  function collect(manifestPath: string, dependency = "@scope/target") {
    const result = collectWhy(manifestPath, dependency, options);
    ok(typeof result !== "string", `Unexpected result: ${result}`);
    return result;
  }

  it("keeps root capability provenance through nested, meta, and cyclic chains", () => {
    const { manifestPath } = configure(["second", "bundle", "bundle"], {}, {}, [
      "first",
      "second",
    ]);
    const result = collect(manifestPath);
    deepEqual(result.reasons, [
      {
        name: "root",
        manifestPath,
        capabilities: ["bundle", "second"],
      },
    ]);
    equal(
      renderWhy(result),
      `${manifestPath}: Packages requiring '@scope/target' through capabilities:\n` +
        `└─ root (${manifestPath})\n` +
        "   ├─ @scope/target (via 'bundle')\n" +
        "   └─ @scope/target (via 'second')"
    );
  });

  it("renders deterministic tree branches across packages and capabilities", () => {
    const { alignDeps } = configure(["second", "bundle"]);
    const manifestPath = writeManifest("", {
      dependencies: { zulu: "1.0.0", alpha: "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    writeManifest("zulu", { "rnx-kit": { alignDeps } });
    writeManifest("alpha", { "rnx-kit": { alignDeps } });
    const result = collect(manifestPath);
    equal(
      renderWhy(result),
      `${manifestPath}: Packages requiring '@scope/target' through capabilities:\n` +
        `├─ alpha (${path.join(directory, "node_modules", "alpha", "package.json")})\n` +
        "│  ├─ @scope/target (via 'bundle')\n" +
        "│  └─ @scope/target (via 'second')\n" +
        `├─ root (${manifestPath})\n` +
        "│  ├─ @scope/target (via 'bundle')\n" +
        "│  └─ @scope/target (via 'second')\n" +
        `└─ zulu (${path.join(directory, "node_modules", "zulu", "package.json")})\n` +
        "   ├─ @scope/target (via 'bundle')\n" +
        "   └─ @scope/target (via 'second')"
    );
    equal(renderWhy(collect(manifestPath)), renderWhy(result));
  });

  it("does not mutate cached preset package objects or existing provides symbols", () => {
    const { preset, manifestPath } = configure();
    const cached = mergePresets([preset], directory);
    const symbol = Symbol.for("provides");
    for (const profile of Object.values(cached)) {
      for (const pkg of Object.values(profile)) {
        pkg[symbol] = "original";
        Object.freeze(pkg);
      }
    }
    const before = structuredClone(cached);
    collect(manifestPath);
    collect(manifestPath);
    deepEqual(structuredClone(cached), before);
    for (const profile of Object.values(cached)) {
      for (const pkg of Object.values(profile)) {
        equal(pkg[symbol], "original");
      }
    }
  });

  it("returns success with a clear explanation when no capabilities match", (t) => {
    const { manifestPath } = configure();
    const log = t.mock.method(console, "log", () => undefined);
    const command = makeWhyCommand("not-managed", options);
    equal(command(manifestPath), "success");
    equal(log.mock.callCount(), 1);
    match(
      log.mock.calls[0].arguments.join(" "),
      /No packages require 'not-managed'/
    );
    deepEqual(collect(manifestPath, "not-managed").reasons, []);
  });

  it("warns about missing capabilities once per profile without failing", (t) => {
    const { manifestPath } = configure(
      ["bundle", "missing", "missing"],
      {},
      {
        second: { name: "#meta", capabilities: ["missing"] },
      },
      ["first", "second"]
    );
    const warning = t.mock.method(console, "warn", () => undefined);
    deepEqual(collect(manifestPath).reasons[0].capabilities, ["bundle"]);
    equal(warning.mock.callCount(), 1);
    match(
      warning.mock.calls[0].arguments.join(" "),
      /missing \(missing in first, second\)/
    );
  });

  for (const field of ["name", "version"]) {
    it(`rejects preset packages missing ${field}`, () => {
      const target = { name: "@scope/target", version: "1.0.0", [field]: "" };
      const { manifestPath } = configure(["bundle"], {}, { target });
      throws(() => collect(manifestPath), new RegExp(`missing ${field}`));
    });
  }

  it("considers both development and production library profiles", () => {
    const { preset } = configure(["target"]);
    writeFileSync(
      preset,
      `module.exports = ${JSON.stringify({
        development: {
          core: { name: "react-native", version: "0.71.0" },
          target: { name: "development-target", version: "2.0.0" },
        },
        production: {
          core: { name: "react-native", version: "0.70.0" },
          target: { name: "production-target", version: "1.0.0" },
        },
      })};`
    );
    const manifestPath = writeManifest("", {
      "rnx-kit": {
        alignDeps: {
          presets: [preset],
          capabilities: ["target"],
          requirements: {
            development: ["react-native@0.71"],
            production: ["react-native@0.70"],
          },
        },
      },
    });
    for (const query of ["development-target", "production-target"]) {
      deepEqual(collect(manifestPath, query).reasons[0].capabilities, [
        "target",
      ]);
    }
  });

  it("does not inspect dependencies of libraries", () => {
    const { manifestPath, alignDeps } = configure([], {
      dependencies: { child: "1.0.0" },
    });
    writeManifest("child", {
      "rnx-kit": { alignDeps: { ...alignDeps, capabilities: ["bundle"] } },
    });
    deepEqual(collect(manifestPath).reasons, []);
  });

  it("does not report production-only devOnly packages for libraries", () => {
    const { preset } = configure(["target"]);
    writeFileSync(
      preset,
      `module.exports = ${JSON.stringify({
        development: {
          core: { name: "react-native", version: "0.71.0" },
          target: {
            name: "development-target",
            version: "2.0.0",
            devOnly: true,
          },
        },
        production: {
          core: { name: "react-native", version: "0.70.0" },
          target: {
            name: "production-target",
            version: "1.0.0",
            devOnly: true,
            capabilities: ["nested"],
          },
          nested: {
            name: "production-nested",
            version: "1.0.0",
            devOnly: true,
          },
        },
      })};`
    );
    const manifestPath = writeManifest("", {
      "rnx-kit": {
        alignDeps: {
          presets: [preset],
          capabilities: ["target"],
          requirements: {
            development: ["react-native@0.71"],
            production: ["react-native@0.70"],
          },
        },
      },
    });
    deepEqual(collect(manifestPath, "production-target").reasons, []);
    deepEqual(collect(manifestPath, "production-nested").reasons, []);
    deepEqual(
      collect(manifestPath, "development-target").reasons[0].capabilities,
      ["target"]
    );
  });

  for (const devOnly of [true, false]) {
    it(`uses the first production package's devOnly=${devOnly} flag across library profiles`, () => {
      const { preset } = configure(["target"]);
      writeFileSync(
        preset,
        `module.exports = ${JSON.stringify({
          first: {
            core: { name: "react-native", version: "0.69.0" },
            target: { name: "production-target", version: "1.0.0", devOnly },
          },
          second: {
            core: { name: "react-native", version: "0.70.0" },
            target: {
              name: "production-target",
              version: "2.0.0",
              devOnly: !devOnly,
            },
          },
          development: {
            core: { name: "react-native", version: "0.71.0" },
            target: { name: "development-target", version: "3.0.0" },
          },
        })};`
      );
      const manifestPath = writeManifest("", {
        "rnx-kit": {
          alignDeps: {
            presets: [preset],
            capabilities: ["target"],
            requirements: {
              development: ["react-native@0.71"],
              production: ["react-native@0.69 || 0.70"],
            },
          },
        },
      });
      equal(
        collect(manifestPath, "production-target").reasons.length,
        devOnly ? 0 : 1
      );
    });
  }

  it("inherits nested dev-only packages through production capabilities in apps", () => {
    const { alignDeps } = configure(
      ["bundle"],
      {},
      {
        target: { name: "@scope/target", version: "1.0.0", devOnly: true },
      }
    );
    const manifestPath = writeManifest("", {
      dependencies: { child: "1.0.0" },
      "rnx-kit": {
        kitType: "app",
        alignDeps: { ...alignDeps, capabilities: [] },
      },
    });
    writeManifest("child", { "rnx-kit": { alignDeps } });
    deepEqual(
      collect(manifestPath).reasons.map(({ name, capabilities }) => [
        name,
        capabilities,
      ]),
      [["child", ["bundle"]]]
    );
  });

  it("reports root, direct and transitive production declarations once in sorted order", () => {
    const { alignDeps } = configure(["bundle"]);
    const manifestPath = writeManifest("", {
      dependencies: { zulu: "1.0.0", alpha: "1.0.0", plain: "1.0.0" },
      devDependencies: { development: "1.0.0" },
      peerDependencies: { peer: "1.0.0" },
      optionalDependencies: { optional: "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    writeManifest("zulu", {
      dependencies: { alpha: "1.0.0" },
      "rnx-kit": { alignDeps },
    });
    writeManifest("alpha", {
      dependencies: { zulu: "1.0.0" },
      "rnx-kit": { alignDeps },
    });
    writeManifest("plain", {
      dependencies: { transitive: "1.0.0" },
    });
    writeManifest("transitive", {
      "rnx-kit": { reactNativeVersion: "0.70", capabilities: ["bundle"] },
    });
    for (const name of ["development", "peer", "optional"]) {
      writeManifest(name, { "rnx-kit": { alignDeps } });
    }
    const result = collect(manifestPath);
    deepEqual(
      result.reasons.map(({ name, capabilities }) => [name, capabilities]),
      [
        ["alpha", ["bundle"]],
        ["root", ["bundle"]],
        ["transitive", ["bundle"]],
        ["zulu", ["bundle"]],
      ]
    );
  });

  it("excludes inherited core and dev-only capabilities but retains root declarations", () => {
    const { alignDeps } = configure(["dev-only", "core-extra"]);
    const manifestPath = writeManifest("", {
      dependencies: { child: "1.0.0", empty: "1.0.0", unconfigured: "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    writeManifest("child", { "rnx-kit": { alignDeps } });
    writeManifest("empty", {
      "rnx-kit": { alignDeps: { requirements: ["react-native@0.70"] } },
    });
    writeManifest("unconfigured", {
      "rnx-kit": { capabilities: ["bundle"] },
    });
    for (const query of ["dev-tool", "platform"]) {
      deepEqual(
        collect(manifestPath, query).reasons.map(({ name }) => name),
        ["root"]
      );
    }
  });

  it("deduplicates the root when dependency cycles return to it", () => {
    const { alignDeps } = configure(["bundle"]);
    const manifestPath = writeManifest("", {
      dependencies: { child: "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    writeManifest("child", {
      dependencies: { root: "1.0.0" },
      "rnx-kit": { alignDeps },
    });
    symlinkSync(
      directory,
      path.join(directory, "node_modules", "root"),
      "junction"
    );
    deepEqual(
      collect(manifestPath).reasons.map(({ name, capabilities }) => [
        name,
        capabilities,
      ]),
      [
        ["child", ["bundle"]],
        ["root", ["bundle"]],
      ]
    );
  });

  it("rejects multiple app production profiles while allowing them for libraries", (t) => {
    const { alignDeps, manifestPath } = configure(["bundle"], {}, {}, [
      "first",
      "second",
    ]);
    equal(collect(manifestPath).reasons.length, 1);
    const log = t.mock.method(console, "log", () => undefined);
    const command = makeWhyCommand("@scope/target", options);
    for (const capabilities of [["bundle"], []]) {
      writeManifest("", {
        "rnx-kit": {
          kitType: "app",
          alignDeps: { ...alignDeps, capabilities },
        },
      });
      equal(
        collectWhy(manifestPath, "@scope/target", options),
        "invalid-app-requirements"
      );
      equal(command(manifestPath), "invalid-app-requirements");
    }
    equal(log.mock.callCount(), 0);
  });

  it("uses the app profiles narrowed by transitive requirements", () => {
    const { preset, alignDeps } = configure(["target"]);
    writeFileSync(
      preset,
      `module.exports = ${JSON.stringify({
        old: {
          core: { name: "react-native", version: "0.69.0" },
          target: { name: "old-target", version: "1.0.0" },
        },
        current: {
          core: { name: "react-native", version: "0.70.0" },
          target: { name: "new-target", version: "1.0.0" },
        },
      })};`
    );
    const manifestPath = writeManifest("", {
      dependencies: { child: "1.0.0" },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          ...alignDeps,
          requirements: ["react-native@0.69 || 0.70"],
        },
      },
    });
    writeManifest("child", { "rnx-kit": { alignDeps } });
    deepEqual(collect(manifestPath, "old-target").reasons, []);
    equal(collect(manifestPath, "new-target").reasons.length, 2);
  });

  it("handles existing legacy app fixtures without migration or writes", (t) => {
    const manifestPath = path.join(fixture, "package.json");
    const before = readFileSync(manifestPath, "utf8");
    const warning = t.mock.method(console, "warn", () => undefined);
    const result = collectWhy(manifestPath, "react-native-reanimated", {
      ...options,
      write: true,
      migrateConfig: true,
      checkOverrides: true,
    });
    ok(typeof result !== "string");
    deepEqual(
      result.reasons.map(({ name, capabilities }) => [name, capabilities]),
      [["t-800", ["animation"]]]
    );
    equal(readFileSync(manifestPath, "utf8"), before);
    equal(warning.mock.callCount(), 0);
    deepEqual(collect(manifestPath, "react-native-test-app").reasons, []);
    deepEqual(
      collect(manifestPath, "react-native").reasons.map(({ name }) => name),
      ["awesome-repo"]
    );
  });

  it("respects exclusions and existing configuration errors", (t) => {
    t.mock.method(console, "error", () => undefined);
    const { manifestPath } = configure();
    equal(
      collectWhy(manifestPath, "target", {
        ...options,
        excludePackages: ["root"],
      }),
      "excluded"
    );
    writeManifest("", {});
    equal(collectWhy(manifestPath, "target", options), "not-configured");
    writeManifest("", { "rnx-kit": { alignDeps: { requirements: [] } } });
    equal(collectWhy(manifestPath, "target", options), "invalid-configuration");
    writeFileSync(manifestPath, "{}");
    equal(collectWhy(manifestPath, "target", options), "invalid-manifest");
    const command = makeWhyCommand("target", options);
    equal(command(manifestPath), "invalid-manifest");
  });

  it("warns only once when a production dependency cannot be resolved", (t) => {
    const { alignDeps } = configure();
    const manifestPath = writeManifest("", {
      dependencies: { "unresolvable-why-test-dependency": "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    const warning = t.mock.method(console, "warn", () => undefined);
    equal(collect(manifestPath).reasons.length, 1);
    equal(warning.mock.callCount(), 1);
    match(
      warning.mock.calls[0].arguments.join(" "),
      /Unable to resolve module 'unresolvable-why-test-dependency'/
    );
  });

  it("protects against prototype capability names", () => {
    const { manifestPath } = configure(
      ["bundle"],
      {},
      {
        second: {
          name: "#meta",
          capabilities: ["constructor", "prototype", "__proto__"],
        },
      }
    );
    deepEqual(collect(manifestPath).reasons[0].capabilities, ["bundle"]);
  });

  it("ignores forbidden capability declarations in the root and dependencies", (t) => {
    const { alignDeps } = configure(["__proto__", "constructor", "prototype"]);
    const manifestPath = writeManifest("", {
      dependencies: { child: "1.0.0" },
      "rnx-kit": { kitType: "app", alignDeps },
    });
    writeManifest("child", { "rnx-kit": { alignDeps } });
    const warning = t.mock.method(console, "warn", () => undefined);
    deepEqual(collect(manifestPath).reasons, []);
    equal(warning.mock.callCount(), 0);
  });
});
