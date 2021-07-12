import { info, warn } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { BuildOptions, BuildResult, Plugin } from "esbuild";
import * as esbuild from "esbuild";
import type { Graph, Module, SerializerOptions } from "metro";
import type { SerializerConfigT } from "metro-config";
import * as semver from "semver";

export * from "./esbuildTransformerConfig";

type Options = Pick<BuildOptions, "logLevel" | "minify"> & {
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
  const path = require("path");

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

  return JSON.stringify({ ...sourcemap, sources }, undefined, 2);
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
  plugins: MetroPlugin[] = [],
  buildOptions?: Options
): SerializerConfigT["customSerializer"] {
  assertVersion(">=0.66.1");

  return (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ): ReturnType<Required<SerializerConfigT>["customSerializer"]> => {
    plugins.forEach((plugin) => plugin(entryPoint, preModules, graph, options));

    const { dependencies } = graph;
    const metroPlugin: Plugin = {
      name: require("../package.json").name,
      setup: (build) => {
        const pluginOptions = { filter: /.*/ };

        build.onResolve(pluginOptions, (args) => {
          if (dependencies.has(args.path)) {
            return { path: args.path };
          }

          const parent = dependencies.get(args.importer);
          if (parent) {
            return { path: parent.dependencies.get(args.path)?.absolutePath };
          }

          if (preModules.find(({ path }) => path === args.path)) {
            return { path: args.path };
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
            return { contents: outputOf(mod) ?? "" };
          }

          const polyfill = preModules.find(({ path }) => path === args.path);
          if (polyfill) {
            return { contents: outputOf(polyfill) ?? "" };
          }

          if (args.path === __filename) {
            return {
              /**
               * Add all the polyfills in this file. See the `inject` option
               * below for more details.
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
                `export const global = new Function("return this;")();`,

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

    const lodashTransformer = require("esbuild-plugin-lodash");
    const outfile = "main.jsbundle";
    const sourcemapfile = outfile + ".map";

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
        minify: buildOptions?.minify ?? !options.dev,
        outfile,
        plugins: [metroPlugin, lodashTransformer()],
        sourcemap: "external",
        write: false,
      })
      .then(({ outputFiles }: BuildResult) => {
        const result = { code: "", map: "" };
        outputFiles?.forEach(({ path: outputPath, text }) => {
          if (outputPath === "<stdout>" || outputPath.endsWith(outfile)) {
            result.code = text;
          } else if (outputPath.endsWith(sourcemapfile)) {
            result.map = fixSourceMap(outputPath, text);
          }
        });
        info("esbuild bundle size:", result.code.length);
        return result;
      });
  };
}
