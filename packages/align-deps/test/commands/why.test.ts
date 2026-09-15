import type { KitConfig } from "@rnx-kit/types-kit-config";
import { deepEqual, equal, match, throws } from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { makeWhyCommand } from "../../src/commands/why.ts";
import { mergePresets } from "../../src/preset.ts";
import type { Args, Options } from "../../src/types.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const options = { presets: ["microsoft/react-native"] };
const fixture = path.resolve("test/__fixtures__/awesome-repo");

function project(
  t: it.TestContext,
  config: KitConfig = {
    kitType: "app",
    alignDeps: {
      requirements: ["react-native@0.70"],
      capabilities: ["netinfo"],
    },
  }
) {
  const root = mkdtempSync(path.join(tmpdir(), "align-deps-why-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file: string, value: unknown) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value));
    return target;
  };
  const manifest = {
    name: "my-app",
    version: "1.0.0",
    "rnx-kit": config,
  };
  const manifestPath = put("package.json", manifest);
  return { root, put, manifest, manifestPath };
}

function capture(t: it.TestContext) {
  const log = t.mock.method(console, "log", () => undefined);
  const warn = t.mock.method(console, "warn", () => undefined);
  const error = t.mock.method(console, "error", () => undefined);
  return {
    output: () =>
      log.mock.calls.map(({ arguments: args }) => args.join(" ")).join("\n"),
    warn,
    error,
  };
}

function why(name: string, manifest: string, overrides: Partial<Options> = {}) {
  const command = makeWhyCommand(name, { ...options, ...overrides });
  if (command.isRootCommand) {
    throw new Error("why must be a package command");
  }
  return command(manifest);
}

before(() => defineRequire("../../src/preset.ts", import.meta.url));
after(() => undefineRequire());

describe("makeWhyCommand()", () => {
  it("reports legacy transitive declarations using the existing fixture", (t) => {
    const { output } = capture(t);
    equal(
      why(
        "@react-native-community/netinfo",
        path.join(fixture, "package.json")
      ),
      "success"
    );
    equal(
      output(),
      "└─ dutch\n   └─ @react-native-community/netinfo (via 'netinfo')"
    );
  });

  it("reports root and inherited dependency declarations without checking versions", (t) => {
    const { output, warn, error } = capture(t);
    const { put, manifest, manifestPath } = project(t);
    put("package.json", {
      ...manifest,
      dependencies: { library: "1.0.0", plain: "1.0.0" },
      devDependencies: { "not-installed-dev": "*" },
      peerDependencies: { "not-installed-peer": "*" },
    });
    put("node_modules/library/package.json", {
      name: "library",
      version: "1.0.0",
      "rnx-kit": { extends: "./config.json" },
    });
    put("node_modules/library/config.json", {
      alignDeps: {
        requirements: ["react-native@0.69"],
        capabilities: ["netinfo", "netinfo"],
      },
    });
    put("node_modules/plain/package.json", { name: "plain", version: "1.0.0" });
    equal(why("@react-native-community/netinfo", manifestPath), "success");
    equal(
      output(),
      [
        "├─ my-app",
        "│  └─ @react-native-community/netinfo (via 'netinfo')",
        "│",
        "└─ library",
        "   └─ @react-native-community/netinfo (via 'netinfo')",
      ].join("\n")
    );
    equal(error.mock.callCount(), 0);
    equal(warn.mock.callCount(), 0);
  });

  it("scans library dependencies and retains core and dev-only declarations", (t) => {
    const { output } = capture(t);
    const { put, manifest, manifestPath } = project(t, {
      kitType: "library",
      alignDeps: { requirements: ["react-native@0.70"], capabilities: [] },
    });
    put("package.json", { ...manifest, dependencies: { library: "1.0.0" } });
    put("node_modules/library/package.json", {
      name: "library",
      version: "1.0.0",
      "rnx-kit": {
        alignDeps: { capabilities: ["core-ios", "babel-preset-react-native"] },
      },
    });
    equal(why("react-native", manifestPath), "success");
    match(output(), /library\n {3}└─ react-native \(via 'core-ios'\)/);
    equal(why("metro-react-native-babel-preset", manifestPath), "success");
    match(output(), /via 'babel-preset-react-native'/);
  });

  for (const name of [
    "metro-react-native-babel-preset",
    "@react-native/babel-preset",
  ]) {
    it(`includes library production/development profiles for ${name}`, (t) => {
      const { output } = capture(t);
      const { manifestPath } = project(t, {
        kitType: "library",
        alignDeps: {
          requirements: {
            production: ["react-native@0.72"],
            development: ["react-native@0.73"],
          },
          capabilities: ["babel-preset-react-native"],
        },
      });
      equal(why(name, manifestPath), "success");
      equal(
        output(),
        `└─ my-app\n   └─ ${name} (via 'babel-preset-react-native')`
      );
    });
  }

  it("matches nested cyclic meta capabilities without mutating cached presets", (t) => {
    const { output } = capture(t);
    const { root, put, manifest, manifestPath } = project(t);
    const presetPath = path.join(root, "preset.cjs");
    writeFileSync(
      presetPath,
      `module.exports = ${JSON.stringify({
        test: {
          core: { name: "react-native", version: "0.70.0" },
          bundle: {
            name: "#meta",
            capabilities: ["loop", "missing", "target"],
          },
          loop: { name: "#meta", capabilities: ["bundle"] },
          target: { name: "target-package", version: "1.0.0" },
          constructor: { name: "target-package", version: "1.0.0" },
        },
      })};`
    );
    put("package.json", {
      ...manifest,
      "rnx-kit": {
        alignDeps: {
          presets: [presetPath],
          requirements: ["react-native@0.70"],
          capabilities: [
            "bundle",
            "bundle",
            "constructor",
            "prototype",
            "__proto__",
          ],
        },
      },
    });
    const preset = mergePresets([presetPath], root);
    const original = structuredClone(preset);
    for (const profile of Object.values(preset)) {
      for (const pkg of Object.values(profile)) {
        if (pkg.capabilities) Object.freeze(pkg.capabilities);
        Object.freeze(pkg);
      }
      Object.freeze(profile);
    }
    Object.freeze(preset);
    equal(why("target-package", manifestPath), "success");
    equal(output(), "└─ my-app\n   └─ target-package (via 'bundle')");
    deepEqual(preset, original);
  });

  it("skips dependency traversal for unknown targets", (t) => {
    const { output, warn } = capture(t);
    const { put, manifest, manifestPath } = project(t);
    put("package.json", {
      ...manifest,
      dependencies: { "not-installed": "*" },
    });
    equal(why("unknown-package", manifestPath), "success");
    equal(output(), "");
    equal(warn.mock.callCount(), 0);
  });

  it("succeeds silently for a known package with no matching declarations", (t) => {
    const { output } = capture(t);
    const { manifestPath } = project(t);
    equal(why("react", manifestPath), "success");
    equal(output(), "");
  });

  it("warns about unresolved dependencies but keeps root matches", (t) => {
    const { output, warn } = capture(t);
    const { put, manifest, manifestPath } = project(t);
    put("package.json", {
      ...manifest,
      dependencies: { "not-installed": "*" },
    });
    equal(why("@react-native-community/netinfo", manifestPath), "success");
    match(output(), /my-app/);
    equal(warn.mock.callCount(), 1);
  });

  it("never writes or migrates legacy configuration", (t) => {
    capture(t);
    const { manifestPath } = project(t, {
      kitType: "app",
      reactNativeVersion: "0.70",
      capabilities: ["netinfo"],
    });
    const before = readFileSync(manifestPath, "utf8");
    equal(
      why("@react-native-community/netinfo", manifestPath, {
        write: true,
        migrateConfig: true,
      }),
      "success"
    );
    equal(readFileSync(manifestPath, "utf8"), before);
  });

  it("preserves configuration errors and exclusions", (t) => {
    const { output } = capture(t);
    const { put, manifestPath } = project(t);
    equal(
      why("react", manifestPath, { excludePackages: ["my-app"] }),
      "excluded"
    );
    put("package.json", { name: "unconfigured", version: "1.0.0" });
    equal(why("react", manifestPath), "not-configured");
    put("package.json", {});
    equal(why("react", manifestPath), "invalid-manifest");
    equal(output(), "");
  });
});

describe("cli --why", () => {
  let cli: typeof import("../../src/cli.ts").cli;
  let cliOptions: typeof import("../../src/cli.ts").cliOptions;
  const originalExitCode = process.exitCode;
  const originalDirectory = process.cwd();

  before(async () => {
    global.module = {};
    try {
      ({ cli, cliOptions } = await import("../../src/cli.ts"));
    } finally {
      delete global.module;
    }
  });
  afterEach(() => {
    process.exitCode = originalExitCode;
    process.chdir(originalDirectory);
  });

  for (const conflict of [
    { init: "app" },
    { "export-catalogs": "yarn" },
    { "set-version": "0.70" },
  ]) {
    it(`rejects combination with ${Object.keys(conflict)[0]}`, async (t) => {
      const { error } = capture(t);
      await cli({ why: "react", ...conflict });
      equal(process.exitCode, 1);
      match(String(error.mock.calls[0].arguments), /cannot both be specified/);
    });
  }

  for (const why of ["", "  "]) {
    it(`rejects an empty target ${JSON.stringify(why)}`, async (t) => {
      const { error } = capture(t);
      await cli({ why });
      equal(process.exitCode, 1);
      match(String(error.mock.calls[0].arguments), /requires a package name/);
    });
  }

  it("requires a target in the argument parser", () => {
    const yargs = require("yargs/yargs");
    const parser = yargs()
      .exitProcess(false)
      .options(cliOptions)
      .fail((message: string) => {
        throw new Error(message);
      });
    throws(
      () => parser.parse(["--why"]),
      /Not enough arguments following: why/
    );
  });

  it("parses --why with a package path and dispatches the command", async (t) => {
    const { output } = capture(t);
    const { root } = project(t);
    const yargs = require("yargs/yargs");
    await yargs()
      .exitProcess(false)
      .parserConfiguration({ "boolean-negation": false })
      .usage("$0 [packages...]", "align-deps", cliOptions, cli)
      .parseAsync([root, "--why", "@react-native-community/netinfo"]);
    equal(process.exitCode, 0);
    equal(
      output(),
      "└─ my-app\n   └─ @react-native-community/netinfo (via 'netinfo')"
    );
  });

  for (const explicit of [false, true]) {
    it(`uses ${explicit ? "an explicit path" : "the current package"} without running checks`, async (t) => {
      const { output, error } = capture(t);
      const { root, manifestPath } = project(t);
      process.chdir(root);
      const args: Args = {
        why: "@react-native-community/netinfo",
        write: true,
        "migrate-config": true,
      };
      if (explicit) args.packages = [root];
      const before = readFileSync(manifestPath, "utf8");
      await cli(args);
      equal(process.exitCode, 0);
      match(output(), /via 'netinfo'/);
      equal(error.mock.callCount(), 0);
      equal(readFileSync(manifestPath, "utf8"), before);
    });
  }
});
