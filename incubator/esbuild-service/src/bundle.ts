import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import { reactNativePolyfills } from "./plugins/polyfills.ts";
import { reactNativeResolver } from "./plugins/resolver.ts";
import { inferBuildTarget } from "./targets.ts";
import type { BundleServiceOptions } from "./types.ts";

/**
 * Bundles a React Native application using esbuild, without requiring Metro.
 *
 * ## Metro → esbuild mapping
 *
 * | Metro component          | esbuild replacement                              |
 * |--------------------------|--------------------------------------------------|
 * | Transformer (Babel/Flow) | esbuild native TypeScript + JSX loader           |
 * | Dependency graph         | esbuild native bundler                           |
 * | Tree-shaking             | esbuild native tree-shaking                      |
 * | Minifier                 | esbuild native minifier                          |
 * | Source maps              | esbuild native source-map generation             |
 * | Resolver                 | `reactNativeResolver` plugin (reimplemented)     |
 * | Pre-modules / polyfills  | `reactNativePolyfills` plugin (reimplemented)    |
 *
 * ## What cannot be replaced by esbuild
 *
 * - **Dev server with HMR** – esbuild has a basic `serve` mode but does not
 *   implement React Native's fast-refresh / HMR protocol.
 * - **RAM bundles** – Metro's indexed RAM bundle format has no esbuild
 *   equivalent.
 * - **Lazy module loading** – Metro's built-in lazy-loading mechanism requires
 *   a reimplementation of the module loader runtime.
 *
 * @param options Bundle options.
 * @returns A promise that resolves when the bundle has been written to disk.
 */
export async function bundle(options: BundleServiceOptions): Promise<void> {
  const {
    entryFile,
    platform,
    dev = false,
    minify = !dev,
    bundleOutput,
    sourcemapOutput,
    target,
    plugins: extraPlugins = [],
    projectRoot = process.cwd(),
    logLevel = "warning",
    drop,
    pure,
  } = options;

  const resolvedEntry = path.resolve(projectRoot, entryFile);
  const resolvedOutput = path.resolve(projectRoot, bundleOutput);
  const resolvedSourcemap = sourcemapOutput
    ? path.resolve(projectRoot, sourcemapOutput)
    : undefined;

  // Ensure the output directory exists.
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

  const buildTarget = target ?? inferBuildTarget(projectRoot);

  await esbuild.build({
    bundle: true,
    define: {
      __DEV__: JSON.stringify(dev),
      __METRO_GLOBAL_PREFIX__: "''",
      global: "global",
      "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    },
    drop,
    entryPoints: [resolvedEntry],
    legalComments: "none",
    logLevel,
    metafile: false,
    minify,
    outfile: resolvedOutput,
    platform: "node",
    plugins: [
      reactNativePolyfills({
        entryFile: resolvedEntry,
        dev,
      }),
      reactNativeResolver(platform),
      ...extraPlugins,
    ],
    pure,
    sourcemap: resolvedSourcemap ? "external" : false,
    target: buildTarget,
    supported: (() => {
      if (
        typeof buildTarget !== "string" ||
        !buildTarget.startsWith("hermes")
      ) {
        return undefined;
      }

      // Hermes supports these ES6+ features even though the compatibility
      // table may not list them. See the metro-serializer-esbuild package for
      // the original rationale.
      //
      // Note: unlike metro-serializer-esbuild (which receives Babel-pre-
      // processed code), this bundler passes raw TypeScript/ES6 source to
      // esbuild. We therefore also mark const-and-let as supported because
      // Hermes has supported block scoping since its earliest versions.
      return {
        arrow: true,
        "const-and-let": true,
        "default-argument": true,
        destructuring: true,
        generator: true,
        "rest-argument": true,
        "template-literal": true,
      };
    })(),
    write: true,
  });

  // Move the source map to the requested location when it differs from the
  // default `.js.map` path that esbuild writes.
  if (resolvedSourcemap) {
    const defaultMapPath = resolvedOutput + ".map";
    if (
      defaultMapPath !== resolvedSourcemap &&
      fs.existsSync(defaultMapPath)
    ) {
      fs.renameSync(defaultMapPath, resolvedSourcemap);
    }
  }
}
