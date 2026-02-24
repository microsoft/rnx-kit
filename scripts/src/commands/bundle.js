// @ts-check

import { Command, Option } from "clipanion";
import * as fs from "node:fs";

/**
 * @typedef {import("esbuild").BuildOptions} BuildOptions
 * @typedef {BuildOptions["platform"]} Platform
 * @typedef {{ node?: string }} Engines
 * @typedef {{
 *   name: string;
 *   main: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 *   peerDependenciesMeta?: Record<string, { optional: boolean; }>;
 *   engines?: Record<string, string>;
 * }} Manifest
 * @typedef {{ minify?: boolean, platform?: string, sourceMap?: boolean }} BundleOptions
 * @typedef {(manifest: Manifest) => Partial<BuildOptions>} OptionPreset
 */

export class BundleCommand extends Command {
  /** @override */
  static paths = [["bundle"]];

  /** @override */
  static usage = Command.Usage({
    description: "Bundles the current package",
    details: `
      This command leverages esbuild to do a fast bundle of the current package. The entry point will be src/index.ts,
      with output corresponding to the main field in package.json.

      Most settings will automatically be picked up based on the target platform.
    `,
    examples: [["Bundle the current package", "$0 bundle"]],
  });

  minify = Option.Boolean("--minify", false, {
    description: "Minify the bundle",
  });

  platform = Option.String("--platform", "node", {
    description:
      "Target platform to bundle for. One of browser, neutral, node, or yarn.",
  });

  sourceMap = Option.Boolean("--sourceMap", false, {
    description: "Generate an associated source map",
  });

  async execute() {
    const manifestFile = fs.readFileSync("package.json", { encoding: "utf-8" });
    const manifest = JSON.parse(manifestFile);
    const { name, main: outfile } = manifest;

    const esbuild = await import("esbuild");
    await esbuild.build({
      ...(await platformOptions(this.platform, manifest)),
      bundle: true,
      outfile,
      entryPoints: ["src/index.ts"],
      minify: Boolean(this.minify),
      sourcemap: Boolean(this.sourceMap),
    });

    // report success with file size of the output file
    if (!process.stdin.isTTY && fs.existsSync(outfile)) {
      const sizeKb = Math.round(fs.statSync(outfile).size / 1024);
      this.context.stdout.write(`Success: ${name} bundled: ${sizeKb}kb\n`);
    }
  }
}

const DEFAULT_TARGET_ENV = "es2021";

/**
 * @param {Manifest} manifest
 * @returns {Promise<string>}
 */
async function getNodeTarget(manifest) {
  const { getRootEnginesField } = await import("../rootWorkspace.js");

  const enginesNode = manifest.engines?.node ?? getRootEnginesField().node;
  const match = enginesNode?.match(/(\d+)\.(\d+)/);
  if (!match) {
    throw new Error("Could not get minimum Node version");
  }

  return `node${match[1]}.${match[2]}`;
}

/**
 * @param {Manifest} manifest
 * @returns {Partial<BuildOptions>}
 */
function presetBase(manifest) {
  const { dependencies, peerDependencies } = manifest;
  return {
    external: [
      ...(dependencies ? Object.keys(dependencies) : []),
      ...(peerDependencies ? Object.keys(peerDependencies) : []),
      "./package.json",
    ],
    conditions: ["typescript"],
  };
}

/**
 * @param {Manifest} manifest
 * @returns {Promise<Partial<BuildOptions>>}
 */
async function nodePreset(manifest) {
  return {
    ...presetBase(manifest),
    banner: { js: "#!/usr/bin/env node" },
    platform: "node",
    target: await getNodeTarget(manifest),
  };
}

/**
 * @param {Manifest} manifest
 * @returns {Partial<BuildOptions>}
 */
function browserPreset(manifest) {
  return {
    ...presetBase(manifest),
    platform: "browser",
    target: DEFAULT_TARGET_ENV,
  };
}

/**
 * @param {Manifest} manifest
 * @returns {Partial<BuildOptions>}
 */
function neutralPreset(manifest) {
  return {
    ...presetBase(manifest),
    platform: "neutral",
    target: DEFAULT_TARGET_ENV,
  };
}

/**
 * @param {Manifest} manifest
 * @returns {Promise<Partial<BuildOptions>>}
 */
async function yarnPreset(manifest) {
  const { getDynamicLibs } = await import("@yarnpkg/cli");
  const { name, peerDependenciesMeta } = manifest;
  return {
    banner: {
      js: [
        "/* eslint-disable */",
        "//prettier-ignore",
        "module.exports = {",
        `name: ${JSON.stringify(name)},`,
        "factory: function (require) {",
      ].join("\n"),
    },
    globalName: "plugin",
    format: "iife",
    footer: {
      js: ["return plugin;", "}", "};"].join("\n"),
    },
    resolveExtensions: [".tsx", ".ts", ".jsx", ".mjs", ".js", ".css", ".json"],
    external: [
      ...(peerDependenciesMeta ? Object.keys(peerDependenciesMeta) : []),
      ...getDynamicLibs().keys(),
    ],
    platform: "node",
    target: await getNodeTarget(manifest),
    supported: {
      /*
      Yarn plugin-runtime did not support builtin modules prefixed with "node:".
      See https://github.com/yarnpkg/berry/pull/5997
      As a solution, and for backwards compatibility, esbuild should strip these prefixes.
      */
      "node-colon-prefix-import": false,
      "node-colon-prefix-require": false,
    },
  };
}

/**
 * @param {unknown} platform
 * @param {Manifest} manifest
 * @returns {Promise<Partial<BuildOptions>>}
 */
async function platformOptions(platform, manifest) {
  const platformKey = typeof platform === "string" ? platform : "node";
  switch (platformKey) {
    case "browser":
      return browserPreset(manifest);
    case "neutral":
      return neutralPreset(manifest);
    case "yarn":
      return await yarnPreset(manifest);
    default:
      return await nodePreset(manifest);
  }
}
