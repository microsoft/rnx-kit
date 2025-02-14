// @ts-check

import { getDynamicLibs } from "@yarnpkg/cli";
import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {import("esbuild").Plugin} Plugin
 */

const matchAll = /()/;
// Splits a require request into its components, or return null if the request is a file path
const pathRegExp =
  /^(?![a-zA-Z]:[\\/]|\\\\|\.{0,2}(?:\/|$))((?:@[^/]+\/)?[^/]+)\/*(.*|)$/;

/**
 * @param {string} basedir
 * @returns {{name: string, node: string}}
 */
function pkgJsonInfo(basedir) {
  const pkgJsonPath = path.join(basedir, `package.json`);
  const { name, engines } = JSON.parse(
    fs.readFileSync(pkgJsonPath, { encoding: `utf8` })
  );
  const node = engines?.node ?? `>=16.17.0`;
  return { name, node };
}

/**
 *
 * @param {string} name
 * @returns {string | undefined}
 */
function getModuleName(name) {
  if (name.startsWith("./") || name.startsWith("../")) {
    return undefined;
  }
  const parts = name.split("/");
  let result = parts.shift();
  if (result?.startsWith("@")) {
    const next = parts.shift();
    result += next ? "/" + next : "";
  }
  return result;
}

/**
 * @param {string} outputPath
 * @returns {number}
 */
function getBundleSize(outputPath) {
  const stats = fs.statSync(outputPath);
  return stats.size;
}

const options = {
  noMinify: false,
  input: `src/index.ts`,
  output: `dist/plugin.js`,
  sourceMap: true,
  metafile: false,
};

/** @type {import("../process.js").Command} */
export async function bundlePlugin() {
  const basedir = process.cwd();
  const { name } = pkgJsonInfo(basedir);
  const modules = new Set(getDynamicLibs().keys());
  const output = path.join(basedir, options.output);

  //const minVersion = semver.minVersion(node)?.version ?? "16";

  /** @type {Plugin} */
  const dynamicLibResolver = {
    name: `dynamic-lib-resolver`,
    setup(build) {
      build.onResolve({ filter: matchAll }, async (args) => {
        const moduleName = getModuleName(args.path);
        if (!moduleName || !modules.has(moduleName)) {
          return undefined;
        }

        return {
          path: args.path,
          external: true,
        };
      });
    },
  };

  const esbuild = await import("esbuild");
  await esbuild
    .build({
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
      footer: {
        js: [`return plugin;`, `}`, `};`].join(`\n`),
      },
      entryPoints: [path.resolve(basedir, options.input)],
      bundle: true,
      outfile: output,
      metafile: options.metafile,
      // Default extensions + .mjs
      resolveExtensions: [
        `.tsx`,
        `.ts`,
        `.jsx`,
        `.mjs`,
        `.js`,
        `.css`,
        `.json`,
      ],
      external: [...getDynamicLibs().keys()],
      logLevel: `silent`,
      format: `iife`,
      platform: `node`,
      minify: !options.noMinify,
      sourcemap: options.sourceMap,
      target: `node18.12`,
      supported: {
        /*
        Yarn plugin-runtime did not support builtin modules prefixed with "node:".
        See https://github.com/yarnpkg/berry/pull/5997
        As a solution, and for backwards compatibility, esbuild should strip these prefixes.
        */
        "node-colon-prefix-import": false,
        "node-colon-prefix-require": false,
      },
    })
    .then((res) => {
      // output the successful bundle and the size of the bundle
      if (res.errors.length === 0) {
        console.log(
          `Successfully bundled ${name} (${Math.round(getBundleSize(output) / 1024)}kb)`
        );
      } else {
        console.error(`Failed to bundle ${name}`);
      }
    });
}
