// @ts-check

import { getDynamicLibs } from "@yarnpkg/cli";
import * as fs from "node:fs";

/**
 * @typedef {import("esbuild").BuildOptions} BuildOptions
 * @typedef {BuildOptions["platform"]} Platform
 * @typedef {{ node?: string }} Engines
 * @typedef {{ name: string, main: string, dependencies?: Record<string, unknown>, peerDependencies?: Record<string, unknown>, engines?: Record<string, string> }} Manifest
 * @typedef {{ minify?: boolean, platform?: string, sourceMap?: boolean }} BundleOptions
 * @typedef {(manifest: Manifest) => Partial<BuildOptions>} OptionPreset
 */

/** @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
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

/** @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
function nodePreset(manifest) {
  return {
    ...presetBase(manifest),
    banner: { js: "#!/usr/bin/env node" },
    platform: "node",
    target: getNodeTarget(manifest),
  };
}

/** @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
function browserPreset(manifest) {
  return {
    ...presetBase(manifest),
    platform: "browser",
    target: "es2021",
  };
}

/** @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
function neutralPreset(manifest) {
  return {
    ...presetBase(manifest),
    platform: "neutral",
    target: "es2021",
  };
}

/** @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
function yarnPreset(manifest) {
  const name = manifest.name;
  return {
    banner: {
      js: [
        `/* eslint-disable */`,
        `//prettier-ignore`,
        `module.exports = {`,
        `name: ${JSON.stringify(name)},`,
        `factory: function (require) {`,
      ].join(`\n`),
    },
    globalName: `plugin`,
    format: "iife",
    footer: {
      js: [`return plugin;`, `}`, `};`].join(`\n`),
    },
    resolveExtensions: [`.tsx`, `.ts`, `.jsx`, `.mjs`, `.js`, `.css`, `.json`],
    external: [...getDynamicLibs().keys()],
    platform: "node",
    target: getNodeTarget(manifest),
  };
}

/** @type {Record<string, OptionPreset>} */
const presets = {
  node: nodePreset,
  browser: browserPreset,
  neutral: neutralPreset,
  yarn: yarnPreset,
};

/** @param {unknown} platform, @param {Manifest} manifest, @returns {Partial<BuildOptions>} */
function platformOptions(platform, manifest) {
  const platformKey =
    platform && typeof platform === "string" ? platform : "node";
  const preset = presets[platformKey] || presets.node;
  return preset(manifest);
}

/** @param {Manifest} manifest, @returns {string} */
function getNodeTarget(manifest) {
  const enginesNode = manifest.engines?.node;
  const match = enginesNode?.match(/(\d+)\.(\d+)/);
  return match ? `node${match[1]}.${match[2]}` : "node16.17";
}

/**
 * @param {Record<string, unknown> | undefined} options
 */
export async function bundle(options) {
  const { minify, platform, sourceMap } = options || {};

  const manifestFile = fs.readFileSync("package.json", { encoding: "utf-8" });
  const manifest = JSON.parse(manifestFile);

  const esbuild = await import("esbuild");
  await esbuild.build({
    ...platformOptions(platform, manifest),
    bundle: true,
    outfile: manifest.main,
    entryPoints: ["src/index.ts"],
    minify: Boolean(minify),
    sourcemap: Boolean(sourceMap),
  });
}
