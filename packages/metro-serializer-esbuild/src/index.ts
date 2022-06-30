import { info, warn } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { findPackage, readPackage } from "@rnx-kit/tools-node";
import type { BuildOptions, BuildResult, Plugin } from "esbuild";
import * as esbuild from "esbuild";
import type { Dependencies, Graph, Module, SerializerOptions } from "metro";
import type { SerializerConfigT } from "metro-config";
import * as path from "path";
import * as semver from "semver";

export { esbuildTransformerConfig } from "./esbuildTransformerConfig";

export type Options = Pick<BuildOptions, "logLevel" | "minify" | "target"> & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
};

function assertVersion(requiredVersion: string): void {
  const { version } = require("metro/package.json");
  if (!semver.satisfies(version, requiredVersion)) {
    throw new Error(
      `Metro version ${requiredVersion} is required; got ${version}`
    );
  }
}

function escapePath(path: string): string {
  return path.replace(/\\+/g, "\\\\");
}

function fixSourceMap(outputPath: string, text: string): string {
  /**
   * All paths in the source map are relative to the directory
   * containing the source map.
   *
   * See https://esbuild.github.io/api/#source-root
   */
  const sourceRoot = path.dirname(outputPath);
  const sourcemap = JSON.parse(text);
  const sources = sourcemap.sources.map((file: string) =>
    path.resolve(sourceRoot, file)
  );

  return JSON.stringify({ ...sourcemap, sources });
}

/**
 * Returns whether the specified module has any side effects.
 *
 * For details on how this field works, please see
 * https://webpack.js.org/guides/tree-shaking/.
 *
 * @param modulePath Absolute path to a module
 * @returns Whether the specified module has any side effects.
 */
const getSideEffects = (() => {
  const pkgCache: Record<string, boolean | string[] | undefined> = {};
  const getSideEffectsFromCache = (pkgJson: string) => {
    if (!(pkgJson in pkgCache)) {
      const { sideEffects } = readPackage(pkgJson);
      if (Array.isArray(sideEffects)) {
        const fg = require("fast-glob");
        pkgCache[pkgJson] = fg
          .sync(sideEffects, {
            cwd: path.dirname(pkgJson),
            absolute: true,
          })
          .map((p: string) => p.replace(/[/\\]/g, path.sep));
      } else if (typeof sideEffects === "boolean") {
        pkgCache[pkgJson] = sideEffects;
      } else {
        pkgCache[pkgJson] = undefined;
      }
    }
    return pkgCache[pkgJson];
  };
  return (modulePath: string): boolean | undefined => {
    const pkgJson = findPackage(modulePath);
    if (!pkgJson) {
      return undefined;
    }

    const sideEffects = getSideEffectsFromCache(pkgJson);
    return Array.isArray(sideEffects)
      ? sideEffects.includes(modulePath)
      : sideEffects;
  };
})();

function isImporting(moduleName: string, dependencies: Dependencies): boolean {
  const iterator = dependencies.keys();
  for (let key = iterator.next(); !key.done; key = iterator.next()) {
    if (key.value.includes(moduleName)) {
      return true;
    }
  }
  return false;
}

function isRedundantPolyfill(modulePath: string): boolean {
  // __prelude__: The content of `__prelude__` is passed to esbuild with `define`
  // polyfills/require.js: `require` is already provided by esbuild
  return /(?:__prelude__|[/\\]polyfills[/\\]require.js)$/.test(modulePath);
}

function outputOf(module: Module | undefined): string | undefined {
  return module?.output?.map(({ data }) => data.code).join("\n");
}

/**
 * esbuild bundler for Metro.
 */
export function MetroSerializer(
  metroPlugins: MetroPlugin[] = [],
  buildOptions?: Options
): SerializerConfigT["customSerializer"] {
  assertVersion(">=0.66.1");

  return (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ): ReturnType<Required<SerializerConfigT>["customSerializer"]> => {
    metroPlugins.forEach((plugin) =>
      plugin(entryPoint, preModules, graph, options)
    );

    const { dependencies } = graph;
    const metroPlugin: Plugin = {
      name: require("../package.json").name,
      setup: (build) => {
        const pluginOptions = { filter: /.*/ };

        // Metro does not inject `"use strict"`, but esbuild does. We should
        // strip them out like Metro does. See also
        // https://github.com/facebook/metro/blob/0fe1253cc4f76aa2a7683cfb2ad0253d0a768c83/packages/metro-react-native-babel-preset/src/configs/main.js#L68
        if (!options.dev) {
          const encoder = new TextEncoder();
          build.onEnd(({ outputFiles }) => {
            outputFiles?.forEach(({ path, text }, index) => {
              const newText = text.replace(/"use strict";\s*/g, "");
              outputFiles[index] = {
                path,
                contents: encoder.encode(newText),
                text: newText,
              };
            });
          });
        }

        build.onResolve(pluginOptions, (args) => {
          if (dependencies.has(args.path)) {
            return {
              path: args.path,
              sideEffects: getSideEffects(args.path),
              pluginData: args.pluginData,
            };
          }

          const parent = dependencies.get(args.importer);
          if (parent) {
            const path = parent.dependencies.get(args.path)?.absolutePath;
            return {
              path,
              sideEffects: path ? getSideEffects(path) : undefined,
              pluginData: args.pluginData,
            };
          }

          if (preModules.find(({ path }) => path === args.path)) {
            return {
              path: args.path,
              pluginData: args.pluginData,
            };
          }

          throw new Error(
            `Could not resolve '${args.path}' from '${args.importer}'`
          );
        });

        build.onLoad(pluginOptions, (args) => {
          // Ideally, we should be adding external files to the options object
          // that we pass to `esbuild.build()` below. Since it doesn't work for
          // some reason, we'll filter them out here instead.
          if (
            buildOptions?.fabric !== true &&
            args.path.endsWith("ReactFabric-prod.js")
          ) {
            return { contents: "" };
          }

          const mod = dependencies.get(args.path);
          if (mod) {
            return {
              contents: outputOf(mod) ?? "",
              pluginData: args.pluginData,
            };
          }

          const polyfill = preModules.find(({ path }) => path === args.path);
          if (polyfill) {
            return {
              contents: outputOf(polyfill) ?? "",
              pluginData: args.pluginData,
            };
          }

          if (args.path === __filename) {
            return {
              /**
               * Add all the polyfills in this file. See the `inject` option
               * below for more details.
               *
               * We must ensure that the content is ES5-friendly so esbuild
               * doesn't blow up when targeting ES5, e.g. use `var` instead of
               * `let` and `const`.
               */
              contents: [
                /**
                 * Many React Native modules expect `global` to be passed with
                 * Metro's `require` polyfill. We need to re-create it since
                 * we're using esbuild's `require`.
                 *
                 * The `Function` constructor creates functions that execute in
                 * the global scope. We use this trait to ensure that `this`
                 * references the global object.
                 *
                 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function#description
                 */
                `export var global = new Function("return this;")();`,

                /** Polyfills */
                ...preModules
                  .filter(({ path }) => !isRedundantPolyfill(path))
                  .map(({ path }) => `require("${escapePath(path)}");`),

                /**
                 * Ensure that `react-native/Libraries/Core/InitializeCore.js`
                 * gets executed first. Note that this list may include modules
                 * from platforms other than the one we're targeting.
                 */
                ...options.runBeforeMainModule
                  .filter((value) => dependencies.has(value))
                  .map((value) => `require("${escapePath(value)}");`),
              ].join("\n"),
            };
          }

          warn(`No such module: ${args.path}`);
          return { contents: "" };
        });
      },
    };

    // `outfile` is only meant to give esbuild a name it can use to generate
    // the sourcemap and insert it into `BuildResult["outputFiles"]`. We've
    // disabled writing to disk by setting `write: false`. Metro will handle
    // the rest after we return code + sourcemap.
    const outfile = "main.jsbundle";
    const sourcemapfile = outfile + ".map";

    const plugins = [metroPlugin];
    if (isImporting("lodash", dependencies)) {
      const lodashTransformer = require("esbuild-plugin-lodash");
      plugins.push(lodashTransformer());
    }

    return esbuild
      .build({
        bundle: true,
        define: {
          __DEV__: JSON.stringify(Boolean(options.dev)),
          __METRO_GLOBAL_PREFIX__: "''",
          global: "global",
        },
        entryPoints: [entryPoint],
        inject: [
          /**
           * A require call is generated and prepended to _all_ modules for each
           * injected file. This can increase the bundle size significantly if
           * there are many polyfills and modules. For just four polyfills (e.g.
           * `console.js`, `error-guard.js`, `Object.es7.js`, and
           * `InitializeCore.js`), we've seen an increase of ~180 KB in a small
           * to medium sized app. We can work around this issue by adding all
           * the polyfills in a single file that we inject here.
           */
          __filename,
        ],
        legalComments: "none",
        logLevel: buildOptions?.logLevel ?? "error",
        metafile: Boolean(buildOptions?.analyze),
        minify: buildOptions?.minify ?? !options.dev,
        outfile,
        plugins,
        sourcemap: "external",

        // To ensure that Hermes is able to consume this bundle, we must target
        // ES5. Hermes is missing a bunch of ES6 features, such as block scoping
        // (see https://github.com/facebook/hermes/issues/575).
        target: buildOptions?.target ?? "hermes0",

        write: false,
      })
      .then(({ metafile, outputFiles }: BuildResult) => {
        const result = { code: "", map: "" };
        outputFiles?.forEach(({ path: outputPath, text }) => {
          if (outputPath === "<stdout>" || outputPath.endsWith(outfile)) {
            result.code = text;
          } else if (outputPath.endsWith(sourcemapfile)) {
            result.map = fixSourceMap(outputPath, text);
          }
        });
        if (metafile) {
          esbuild
            .analyzeMetafile(metafile, {
              verbose: buildOptions?.analyze === "verbose",
            })
            .then((text) => info(text));
        } else {
          info("esbuild bundle size:", result.code.length);
        }
        return result;
      });
  };
}
