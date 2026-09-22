import { deepEqual, equal, fail, match, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { makeWhyCommand } from "../../src/commands/why.ts";
import { mergePresets } from "../../src/preset.ts";
import type { Args, Options } from "../../src/types.ts";
import { defineRequire, fixturePath, undefineRequire } from "../helpers.ts";

function capture(t: it.TestContext) {
  const noop = () => undefined;
  const log = t.mock.method(console, "log", noop);
  return {
    output: () =>
      log.mock.calls.map(({ arguments: args }) => args.join(" ")).join("\n"),
    warn: t.mock.method(console, "warn", noop),
    error: t.mock.method(console, "error", noop),
  };
}

describe("makeWhyCommand()", () => {
  function why(
    name: string,
    manifest: string,
    overrides: Partial<Options> = {}
  ) {
    const command = makeWhyCommand(name, {
      presets: ["microsoft/react-native"],
      ...overrides,
    });
    ok(!command.isRootCommand);
    return command(fixturePath(manifest));
  }

  before(() => defineRequire("../../src/preset.ts", import.meta.url));

  after(() => undefineRequire());

  it("reports legacy transitive declarations", (t) => {
    const { output } = capture(t);
    equal(
      why("@react-native-community/netinfo", "awesome-repo/package.json"),
      "success"
    );
    equal(
      output(),
      "└─ dutch\n   └─ @react-native-community/netinfo (via 'netinfo')"
    );
  });

  it("reports transitive capabilities", (t) => {
    const { output } = capture(t);

    equal(why("react", "why/library/package.json"), "success");
    equal(output(), "└─ library\n   └─ react (via 'core-ios')");
  });

  it("reports root and inherited dependency declarations without checking versions", (t) => {
    const { output, warn, error } = capture(t);

    equal(
      why("@react-native-community/netinfo", "why/inherited/package.json"),
      "success"
    );
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
    const manifestPath = "why/library/package.json";

    const { output } = capture(t);

    equal(why("react-native", manifestPath), "success");
    match(output(), /library\n {3}└─ react-native \(via 'core-ios'\)/);
    equal(why("metro-react-native-babel-preset", manifestPath), "success");
    match(
      output(),
      /library\n {3}└─ metro-react-native-babel-preset \(via 'babel-preset-react-native'\)/
    );
  });

  for (const name of [
    "@react-native/babel-preset",
    "metro-react-native-babel-preset",
  ]) {
    it(`includes library production/development profiles for ${name}`, (t) => {
      const { output } = capture(t);

      equal(why(name, "why/library/package.json"), "success");
      equal(
        output(),
        [
          "├─ my-app",
          `│  └─ ${name} (via 'babel-preset-react-native')`,
          "│",
          "└─ library",
          `   └─ ${name} (via 'babel-preset-react-native')`,
        ].join("\n")
      );
    });
  }

  it("matches nested cyclic meta capabilities without mutating cached presets", (t) => {
    const { output } = capture(t);

    const root = fixturePath("why/cyclic");
    const presetPath = path.join(root, "preset.cjs");
    const preset = mergePresets([presetPath], root);
    const original = structuredClone(preset);

    for (const profile of Object.values(preset)) {
      for (const pkg of Object.values(profile)) {
        if (pkg.capabilities) {
          Object.freeze(pkg.capabilities);
        }
        Object.freeze(pkg);
      }
      Object.freeze(profile);
    }
    Object.freeze(preset);

    equal(why("target-package", "why/cyclic/package.json"), "success");
    equal(output(), "└─ my-app\n   └─ target-package (via 'bundle')");
    deepEqual(preset, original);
  });

  it("skips dependency traversal for unknown targets", (t) => {
    const { output, warn } = capture(t);

    equal(
      why("unknown-package", "why/missing-dependency/package.json"),
      "success"
    );
    equal(output(), "");
    equal(warn.mock.callCount(), 0);
  });

  it("succeeds silently for a known package with no matching declarations", (t) => {
    const { output } = capture(t);

    equal(
      why("@react-native-community/netinfo", "misconfigured-app/package.json"),
      "success"
    );
    equal(output(), "");
  });

  it("warns about unresolved dependencies but keeps root matches", (t) => {
    const { output, warn } = capture(t);

    equal(
      why(
        "@react-native-community/netinfo",
        "why/missing-dependency/package.json"
      ),
      "success"
    );
    match(output(), /my-app/);
    equal(warn.mock.callCount(), 1);
  });

  it("never writes or migrates legacy configuration", (t) => {
    capture(t);

    const manifestPath = fixturePath("awesome-repo/package.json");
    const before = fs.readFileSync(manifestPath, "utf-8");

    equal(
      why("@react-native-community/netinfo", "awesome-repo/package.json", {
        write: true,
        migrateConfig: true,
      }),
      "success"
    );
    equal(fs.readFileSync(manifestPath, "utf-8"), before);
  });

  it("preserves configuration errors and exclusions", (t) => {
    const { output } = capture(t);

    equal(
      why("react", "misconfigured-app/package.json", {
        excludePackages: ["misconfigured-app"],
      }),
      "excluded"
    );
    equal(
      why("react", "awesome-repo/node_modules/react/package.json"),
      "not-configured"
    );
    equal(why("react", "why/invalid/package.json"), "invalid-manifest");
    equal(output(), "");
  });
});

describe("cli --why", () => {
  const globalModule = global.module;
  const originalExitCode = process.exitCode;
  const originalDirectory = process.cwd();

  let cli: typeof import("../../src/cli.ts").cli;
  let cliOptions: typeof import("../../src/cli.ts").cliOptions;

  before(async () => {
    defineRequire("../../src/preset.ts", import.meta.url);
    // @ts-expect-error Defining `global.module` for compatibility with CJS
    global.module = {};
    try {
      ({ cli, cliOptions } = await import("../../src/cli.ts"));
    } finally {
      global.module = globalModule;
    }
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    process.chdir(originalDirectory);
  });

  after(() => undefineRequire());

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

  for (const why of ["", "  ", "#meta"]) {
    it(`rejects an empty target: ${JSON.stringify(why)}`, async (t) => {
      const { error } = capture(t);

      await cli({ why });

      equal(process.exitCode, 1);
      match(String(error.mock.calls[0].arguments), /No package was specified/);
    });
  }

  it("requires a target in the argument parser", () => {
    const yargs = require("yargs/yargs");
    const parser = yargs()
      .exitProcess(false)
      .options(cliOptions)
      .fail((message: string) => fail(message));

    throws(
      () => parser.parse(["--why"]),
      /Not enough arguments following: why/
    );
  });

  it("parses --why with a package path and dispatches the command", async (t) => {
    const { output } = capture(t);

    const yargs = require("yargs/yargs");
    await yargs()
      .exitProcess(false)
      .parserConfiguration({ "boolean-negation": false })
      .usage("$0 [packages...]", "align-deps", cliOptions, cli)
      .parseAsync([
        "--why",
        "@react-native-community/netinfo",
        fixturePath("awesome-repo"),
      ]);

    equal(process.exitCode, 0);
    equal(
      output(),
      "└─ dutch\n   └─ @react-native-community/netinfo (via 'netinfo')"
    );
  });

  for (const explicit of [false, true]) {
    it(`uses ${explicit ? "an explicit path" : "the current package"} without running checks`, async (t) => {
      const { output, error } = capture(t);

      const fixture = fixturePath("awesome-repo");
      const manifestPath = path.join(fixture, "package.json");
      process.chdir(fixture);

      const args: Args = {
        why: "@react-native-community/netinfo",
        write: true,
        "migrate-config": true,
      };

      if (explicit) {
        args.packages = [fixture];
      }

      const before = fs.readFileSync(manifestPath, "utf-8");
      await cli(args);

      equal(process.exitCode, 0);
      match(output(), /via 'netinfo'/);
      equal(error.mock.callCount(), 0);
      equal(fs.readFileSync(manifestPath, "utf-8"), before);
    });
  }
});
