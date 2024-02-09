import { info, warn } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { findMetroPath } from "@rnx-kit/tools-react-native/metro";
import type { BuildOptions, BuildResult, Plugin } from "esbuild";
import * as esbuild from "esbuild";
import * as fs from "fs";
import type { SerializerConfigT } from "metro-config";
import * as path from "path";
import { getModulePath, getSideEffects, isImporting, outputOf } from "./module";
import { polyfillAsyncIteratorSymbol } from "./polyfills";
import { absolutizeSourceMap } from "./sourceMap";
import { assertVersion } from "./version";

export { esbuildTransformerConfig } from "./esbuildTransformerConfig";

export type Options = Pick<
  BuildOptions,
  | "drop"
  | "logLevel"
  | "minify"
  | "minifyWhitespace"
  | "minifyIdentifiers"
  | "minifySyntax"
  | "pure"
  | "target"
> & {
  analyze?: boolean | "verbose";
  fabric?: boolean;
  metafile?: string;
  sourceMapPaths?: "absolute" | "relative";
  strictMode?: boolean;
};

function escapePath(path: string): string {
  return path.replace(/\\+/g, "\\\\");
}

function isRedundantPolyfill(modulePath: string): boolean {
  // __prelude__: The content of `__prelude__` is passed to esbuild with `define`
  // polyfills/require.js: `require` is already provided by esbuild
  return /(?:__prelude__|[/\\]polyfills[/\\]require.js)$/.test(modulePath);
}

/**
 * esbuild bundler for Metro.
 */
export function MetroSerializer(
  metroPlugins: MetroPlugin[] = [],
  buildOptions?: Options
): SerializerConfigT["customSerializer"] {
  assertVersion("0.66.1");

  // Signal to every plugin that we're using esbuild.
  process.env["RNX_METRO_SERIALIZER_ESBUILD"] = "true";

  const metroPath = findMetroPath() || "metro";
  const baseJSBundle = require(
    `${metroPath}/src/DeltaBundler/Serializers/baseJSBundle`
  );
  const bundleToString = require(`${metroPath}/src/lib/bundleToString`);

  return (entryPoint, preModules, graph, options) => {
    metroPlugins.forEach((plugin) =>
      plugin(entryPoint, preModules, graph, options)
    );

    if (options.dev) {
      const bundle = baseJSBundle(entryPoint, preModules, graph, options);
      const bundleCode = bundleToString(bundle).code;
      return Promise.resolve(bundleCode);
    }

    const prelude = "__rnx_prelude__";

    // Hermes only implements select ES6 features and is missing others like
    // block scoping (https://github.com/facebook/hermes/issues/575). As of
    // esbuild 0.14.49, we can use the `hermes` target instead of `es5`. Note
    // that this target is somewhat conservative and may require additional
    // Babel plugins.
    const target = buildOptions?.target ?? "hermes0.7.0";

    const { dependencies } = graph;
    const metroPlugin: Plugin = {
      name: require("../package.json").name,
      setup: (build) => {
        // Don't add namespace to all files. esbuild currently adds it to all
        // file paths in the source map. See
        // https://github.com/evanw/esbuild/issues/2283.
        const namespace = "virtual:metro";
        const pluginOptions = { filter: /.*/ };

        // Metro does not inject `"use strict"`, but esbuild does. We can strip
        // them out like Metro does, but it'll break the source map. See also
        // https://github.com/facebook/metro/blob/0fe1253cc4f76aa2a7683cfb2ad0253d0a768c83/packages/metro-react-native-babel-preset/src/configs/main.js#L68
        if (!options.dev && buildOptions?.strictMode === false) {
          const encoder = new TextEncoder();
          build.onEnd(({ outputFiles }) => {
            outputFiles?.forEach(({ hash, path, text }, index) => {
              const newText = text.replace(/"use strict";\s*/g, "");
              outputFiles[index] = {
                path,
                contents: encoder.encode(newText),
                hash,
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
            const path = getModulePath(args.path, parent);
            return {
              path,
              sideEffects: path ? getSideEffects(path) : undefined,
              pluginData: args.pluginData,
            };
          }

          if (preModules.find(({ path }) => path === args.path)) {
            // In certain setups, such as when using external bundles, we may
            // pass virtual files here. If so, we'll need to inherit the
            // namespace of the top-level prelude.
            return {
              path: args.path,
              namespace: fs.existsSync(args.path) ? "" : args.namespace,
              pluginData: args.pluginData,
            };
          }

          if (args.path === prelude) {
            return {
              path: args.path,
              namespace,
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
            buildOptions?.fabric === false &&
            args.path.endsWith("ReactFabric-prod.js")
          ) {
            return { contents: "" };
          }

          const mod = dependencies.get(args.path);
          if (mod) {
            return {
              contents: outputOf(mod, buildOptions?.logLevel) ?? "",
              pluginData: args.pluginData,
            };
          }

          const polyfill = preModules.find(({ path }) => path === args.path);
          if (polyfill) {
            return {
              contents: outputOf(polyfill, buildOptions?.logLevel) ?? "",
              pluginData: args.pluginData,
            };
          }

          if (args.path === prelude) {
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

                /**
                 * Starting with 0.18.8, esbuild lowers async generator
                 * functions. The polyfill assumes that `Symbol.asyncIterator`
                 * is defined, which may not always be the case. For instance,
                 * Hermes currently does not support AsyncIterator.
                 *
                 * @see https://github.com/evanw/esbuild/pull/3194
                 * @see https://github.com/facebook/hermes/issues/820
                 */
                polyfillAsyncIteratorSymbol(esbuild, target),
              ].join("\n"),
            };
          }

          warn(`No such module: ${args.path}`);
          return { contents: "" };
        });
      },
    };

    // `outfile` is required by esbuild to generate the sourcemap and insert it
    // into `BuildResult["outputFiles"]`. It is also used to generate the
    // `//# sourceMappingURL=` comment at the end of bundle. We've disabled
    // writing to disk by setting `write: false`. Metro will handle the rest
    // after we return code + sourcemap.
    const outfile =
      options.sourceMapUrl?.replace(/\.map$/, "") ?? "main.jsbundle";
    const sourcemapfile = options.sourceMapUrl ?? outfile + ".map";

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
        drop: buildOptions?.drop,
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
          prelude,
        ],
        legalComments: "none",
        logLevel: buildOptions?.logLevel ?? "error",
        metafile: Boolean(buildOptions?.analyze || buildOptions?.metafile),
        minify: buildOptions?.minify ?? !options.dev,
        minifyWhitespace: buildOptions?.minifyWhitespace,
        minifyIdentifiers: buildOptions?.minifyIdentifiers,
        minifySyntax: buildOptions?.minifySyntax,
        outfile,
        plugins,
        pure: buildOptions?.pure,
        sourcemap: Boolean(options.sourceMapUrl) && "linked",
        target,
        supported: (() => {
          if (typeof target !== "string" || !target.startsWith("hermes")) {
            return undefined;
          }

          // The following features should be safe to enable if we take into
          // consideration that Hermes does not support classes. They were
          // disabled in esbuild 0.14.49 after the feature compatibility table
          // generator was fixed (see
          // https://github.com/evanw/esbuild/releases/tag/v0.14.49).
          return {
            arrow: true,
            generator: true,
          };
        })(),
        write: false,
      })
      .then(({ metafile, outputFiles }: BuildResult) => {
        const result = { code: "", map: "" };
        outputFiles?.forEach(({ path: outputPath, text }) => {
          if (outputPath === "<stdout>" || outputPath.endsWith(outfile)) {
            result.code = text;
          } else if (outputPath.endsWith(sourcemapfile)) {
            result.map =
              buildOptions?.sourceMapPaths === "absolute"
                ? absolutizeSourceMap(outputPath, text)
                : text;
          }
        });
        if (metafile) {
          if (buildOptions?.analyze) {
            const options = { verbose: buildOptions.analyze === "verbose" };
            esbuild
              .analyzeMetafile(metafile, options)
              .then((text) => info(text));
          }
          if (typeof buildOptions?.metafile === "string") {
            fs.writeFileSync(
              path.join(path.dirname(sourcemapfile), buildOptions.metafile),
              typeof metafile === "string" ? metafile : JSON.stringify(metafile)
            );
            info("esbuild bundle size:", result.code.length);
          }
        } else {
          info("esbuild bundle size:", result.code.length);
        }
        return result;
      });
  };
}
