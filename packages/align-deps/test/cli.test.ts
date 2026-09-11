import type { Config } from "@react-native-community/cli-types";
import { Command } from "commander";
import { deepEqual, equal, match, ok, rejects } from "node:assert/strict";
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
import type { Args } from "../src/types.ts";
import { defineRequire, undefineRequire } from "./helpers.ts";

describe("--why CLI", () => {
  const cwd = process.cwd();
  let directory: string;
  let cli: typeof import("../src/cli.ts").cli;
  let cliOptions: typeof import("../src/cli.ts").cliOptions;
  let alignDepsCommand: typeof import("../src/compatibility/commander.ts").alignDepsCommand;

  before(async () => {
    defineRequire("../src/cli.ts", import.meta.url);
    global.module = {} as NodeModule;
    ({ cli, cliOptions } = await import("../src/cli.ts"));
    ({ alignDepsCommand } = await import("../src/compatibility/commander.ts"));
  });

  it("parses required Commander values and positional package paths", async (t) => {
    const { log } = silence(t);
    const first = writeManifest("first");
    const second = writeManifest("second");
    const command = await parseCommander([
      "--why",
      "react",
      first,
      path.dirname(second),
    ]);
    equal(command.opts().why, "react");
    deepEqual(command.args, [first, path.dirname(second)]);
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 2);
    ok(log.mock.calls[0].arguments.join(" ").includes(first));
    ok(log.mock.calls[1].arguments.join(" ").includes(second));
    await rejects(parseCommander(["--why"]), /argument missing/);
  });

  for (const conflict of ["init", "export-catalogs", "set-version"]) {
    it(`rejects --${conflict} through the real Commander parser`, async (t) => {
      const { log, error } = silence(t);
      await parseCommander(["--why", "react", `--${conflict}`, "app"]);
      equal(process.exitCode, 1);
      equal(log.mock.callCount(), 0);
      match(
        error.mock.calls[0].arguments.join(" "),
        /cannot both be specified/
      );
    });
  }

  it("requires and consumes the Commander catalog output path", async (t) => {
    const { error } = silence(t);
    const output = path.join(directory, "catalog.yaml");
    const manifest = writeManifest();
    const command = await parseCommander([
      "--export-catalogs",
      output,
      "--why",
      "react",
      manifest,
    ]);
    equal(command.opts().exportCatalogs, output);
    deepEqual(command.args, [manifest]);
    equal(process.exitCode, 1);
    match(error.mock.calls[0].arguments.join(" "), /cannot both be specified/);
    equal(cliOptions["export-catalogs"].requiresArg, true);
    await rejects(parseCommander(["--export-catalogs"]), /argument missing/);
    await rejects(parse(["--export-catalogs"]), /Not enough arguments/);
  });

  it("deduplicates explicit directories, manifests, and symlinks", async (t) => {
    const { log, error } = silence(t);
    const manifest = writeManifest("selected");
    const alias = path.join(directory, "alias");
    symlinkSync(path.dirname(manifest), alias, "junction");
    await cli({
      why: "react",
      packages: [
        manifest,
        path.dirname(manifest),
        alias,
        path.join(alias, "package.json"),
      ],
    });
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 1);
    equal(error.mock.callCount(), 0);
    ok(log.mock.calls[0].arguments.join(" ").includes(manifest));
  });

  it("retains discovery failures while inspecting valid explicit inputs", async (t) => {
    const { log, error } = silence(t);
    const valid = writeManifest("valid");
    await cli({
      why: "react",
      packages: [
        path.join(directory, "missing-first"),
        valid,
        path.join(directory, "missing-last"),
      ],
    });
    equal(process.exitCode, 2);
    equal(error.mock.callCount(), 2);
    ok(log.mock.calls[0].arguments.join(" ").includes(valid));
  });
  after(() => {
    undefineRequire();
    global.module = undefined;
  });
  beforeEach(() => {
    const cache = path.join(cwd, "node_modules", ".cache");
    mkdirSync(cache, { recursive: true });
    directory = mkdtempSync(path.join(cache, "rnx-align-deps-why-cli-"));
  });
  afterEach(() => {
    process.chdir(cwd);
    process.exitCode = 0;
    rmSync(directory, { recursive: true, force: true });
  });

  function writeManifest(relative = "", extra: Record<string, unknown> = {}) {
    const root = path.join(directory, relative);
    mkdirSync(root, { recursive: true });
    const manifest = path.join(root, "package.json");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: relative || "root",
        version: "1.0.0",
        devDependencies: { react: "0.0.0" },
        overrides: { react: "0.0.0" },
        "rnx-kit": {
          alignDeps: {
            requirements: ["react-native@0.70"],
            capabilities: ["react"],
          },
        },
        ...extra,
      })
    );
    return manifest;
  }

  async function parseCommander(args: string[]) {
    const program = new Command("rnx-cli")
      .exitOverride()
      .configureOutput({ writeErr: () => undefined });
    const command = program.command(alignDepsCommand.name);
    for (const { name, description } of alignDepsCommand.options) {
      command.option(name, description);
    }
    command.action((options, command) =>
      alignDepsCommand.func(command.args, {} as Config, options)
    );
    await program.parseAsync([alignDepsCommand.name, ...args], {
      from: "user",
    });
    return command;
  }

  function silence(t: it.TestContext) {
    return {
      log: t.mock.method(console, "log", () => undefined),
      error: t.mock.method(console, "error", () => undefined),
      warn: t.mock.method(console, "warn", () => undefined),
    };
  }

  async function parse(args: string[]) {
    const yargs = require("yargs/yargs") as typeof import("yargs/yargs");
    return yargs(args)
      .parserConfiguration({ "boolean-negation": false })
      .exitProcess(false)
      .usage("$0 [packages...]", "test", cliOptions, cli)
      .fail((message, error) => {
        throw error || new Error(message);
      })
      .parseAsync();
  }

  it("only inspects the current package at a workspace root", async (t) => {
    const { log, error } = silence(t);
    const manifest = writeManifest("", {
      private: true,
      workspaces: ["child"],
    });
    writeManifest("child", { "rnx-kit": { alignDeps: { requirements: [] } } });
    writeFileSync(path.join(directory, "yarn.lock"), "");
    process.chdir(directory);
    await cli({ why: "react" });
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 1);
    equal(error.mock.callCount(), 0);
    ok(log.mock.calls[0].arguments.join(" ").includes(manifest));
  });

  it("finds the current package from a nested working directory", async (t) => {
    const { log } = silence(t);
    const manifest = writeManifest();
    const nested = path.join(directory, "src", "deep");
    mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    await cli({ why: "react", packages: [] });
    equal(process.exitCode, 0);
    ok(log.mock.calls[0].arguments.join(" ").includes(manifest));
  });

  it("supports explicit directory and manifest paths and exclusions", async (t) => {
    const { log, error } = silence(t);
    writeManifest();
    const first = writeManifest("first");
    writeManifest("second");
    writeManifest("excluded");
    await cli({
      why: "react",
      packages: [
        first,
        path.join(directory, "second"),
        path.join(directory, "excluded"),
      ],
      "exclude-packages": "excluded",
    });
    equal(process.exitCode, 0);
    equal(error.mock.callCount(), 0);
    equal(log.mock.callCount(), 3);
    match(log.mock.calls[0].arguments.join(" "), /first.*via 'react'/s);
    match(log.mock.calls[1].arguments.join(" "), /second.*via 'react'/s);
    match(log.mock.calls[2].arguments.join(" "), /excluded.*was ignored/);
  });

  it("never checks, writes, migrates, or checks overrides even when requested", async (t) => {
    const { log, error, warn } = silence(t);
    const manifest = writeManifest("", {
      "rnx-kit": { reactNativeVersion: "0.70", capabilities: ["react"] },
    });
    const contents = readFileSync(manifest, "utf8");
    process.chdir(directory);
    await cli({
      why: "react",
      write: true,
      "migrate-config": true,
      "check-overrides": true,
      "no-unmanaged": true,
      requirements: "invalid",
      presets: "does-not-exist",
      "diff-mode": "unknown",
      verbose: true,
    });
    equal(process.exitCode, 0);
    equal(readFileSync(manifest, "utf8"), contents);
    equal(log.mock.callCount(), 1);
    equal(error.mock.callCount(), 0);
    equal(warn.mock.callCount(), 0);
  });

  for (const conflict of ["init", "export-catalogs", "set-version"] as const) {
    it(`rejects --${conflict} in the direct API and standalone parser`, async (t) => {
      const { log, error } = silence(t);
      writeManifest();
      process.chdir(directory);
      await cli({
        why: "react",
        [conflict]: conflict === "init" ? "app" : "0.70",
      });
      equal(process.exitCode, 1);
      equal(log.mock.callCount(), 0);
      match(
        error.mock.calls[0].arguments.join(" "),
        /cannot both be specified/
      );
      await rejects(
        parse([
          "--why",
          "react",
          `--${conflict}`,
          conflict === "init" ? "app" : "0.70",
        ]),
        /mutually exclusive/
      );
    });
  }

  it("rejects missing, empty, whitespace, and non-string query arguments", async (t) => {
    const { error, log } = silence(t);
    for (const why of ["", " ", true, 1, undefined]) {
      await cli({ why } as Args);
      equal(process.exitCode, 1);
    }
    equal(error.mock.callCount(), 5);
    equal(log.mock.callCount(), 0);
    await rejects(parse(["--why"]), /Not enough arguments/);
    await parse(["--why", ""]);
    equal(process.exitCode, 1);
  });

  it("parses the standalone required option and positional package paths", async (t) => {
    const { log } = silence(t);
    const manifest = writeManifest("selected");
    await parse(["--why", "react", manifest]);
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 1);
    match(log.mock.calls[0].arguments.join(" "), /selected.*via 'react'/s);
    equal(cliOptions.why.requiresArg, true);
  });

  it("forwards Commander options and positional arguments", async (t) => {
    const { log, warn } = silence(t);
    const manifest = writeManifest("selected");
    const contents = readFileSync(manifest, "utf8");
    await alignDepsCommand.func([manifest], {} as Config, {
      why: "react",
      write: true,
      migrateConfig: true,
      checkOverrides: true,
    });
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 1);
    equal(warn.mock.callCount(), 0);
    equal(readFileSync(manifest, "utf8"), contents);
    ok(alignDepsCommand.options.some(({ name }) => name === "--why <package>"));
    await alignDepsCommand.func([manifest], {} as Config, {
      why: "react",
      excludePackages: "selected",
    });
    equal(process.exitCode, 0);
    equal(log.mock.callCount(), 2);
    match(log.mock.calls[1].arguments.join(" "), /was ignored/);
  });

  it("rejects Commander conflicts and missing values", async (t) => {
    const { log } = silence(t);
    for (const flag of ["init", "exportCatalogs", "setVersion"]) {
      await alignDepsCommand.func([], {} as Config, {
        why: "react",
        [flag]: "app",
      });
      equal(process.exitCode, 1);
    }
    await alignDepsCommand.func([], {} as Config, { why: true });
    equal(process.exitCode, 1);
    equal(log.mock.callCount(), 0);
  });

  it("reports missing explicit paths without falling back to the current package", async (t) => {
    const { log, error } = silence(t);
    await cli({ why: "react", packages: [path.join(directory, "missing")] });
    equal(process.exitCode, 1);
    equal(log.mock.callCount(), 0);
    match(error.mock.calls[0].arguments.join(" "), /No such file or directory/);
  });

  it("returns existing configuration errors and continues to other selected packages", async (t) => {
    const { log, error } = silence(t);
    const invalid = writeManifest("invalid", {
      "rnx-kit": { alignDeps: { requirements: [] } },
    });
    const unconfigured = writeManifest("unconfigured", {
      "rnx-kit": undefined,
    });
    const valid = writeManifest("valid");
    await cli({ why: "react", packages: [invalid, unconfigured, valid] });
    equal(process.exitCode, 2);
    equal(log.mock.callCount(), 2);
    ok(error.mock.callCount() > 0);
  });

  it("reports preset resolution failures", async (t) => {
    const { error } = silence(t);
    const manifest = writeManifest("", {
      "rnx-kit": {
        alignDeps: {
          requirements: ["react-native@9999"],
          capabilities: ["react"],
        },
      },
    });
    await cli({ why: "react", packages: [manifest] });
    equal(process.exitCode, 1);
    match(error.mock.calls[0].arguments.join(" "), /No profiles could satisfy/);
  });

  it("rejects app requirements resolving to multiple profiles without explaining or writing", async (t) => {
    const { log, error } = silence(t);
    const manifest = writeManifest("", {
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.69 || 0.70"],
          capabilities: ["react"],
        },
      },
    });
    const before = readFileSync(manifest, "utf8");
    await cli({
      why: "react",
      packages: [manifest],
      write: true,
      "migrate-config": true,
    });
    equal(process.exitCode, 1);
    match(
      error.mock.calls[0].arguments.join(" "),
      /app requirements must resolve to a single profile/
    );
    equal(log.mock.callCount(), 1);
    match(log.mock.calls[0].arguments.join(" "), /for more information/);
    equal(readFileSync(manifest, "utf8"), before);
  });

  it("succeeds for no matches, without changing the manifest", async (t) => {
    const { log } = silence(t);
    const manifest = writeManifest();
    const before = readFileSync(manifest, "utf8");
    await cli({ why: "@unknown/package", packages: [manifest] });
    equal(process.exitCode, 0);
    match(
      log.mock.calls[0].arguments.join(" "),
      /No packages require '@unknown\/package'/
    );
    deepEqual(readFileSync(manifest, "utf8"), before);
  });

  it("preserves normal alignment checks and writes when --why is absent", async (t) => {
    silence(t);
    const manifest = writeManifest();
    const before = readFileSync(manifest, "utf8");
    await cli({ packages: [manifest] });
    equal(process.exitCode, 1);
    equal(readFileSync(manifest, "utf8"), before);
    await cli({ packages: [manifest], write: true });
    equal(process.exitCode, 0);
    ok(readFileSync(manifest, "utf8") !== before);
  });
});
