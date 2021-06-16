import type {
  Graph,
  MetroPlugin,
  Module,
  Serializer,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";
import chalk from "chalk";
import type { BuildOptions, BuildResult, Plugin } from "esbuild";
import * as esbuild from "esbuild";
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

function info(...message: (string | number)[]): void {
  console.log(chalk.blue.bold("info"), ...message);
}

function warn(...message: (string | number)[]): void {
  console.warn(chalk.yellow.bold("warn"), ...message);
}

function isRedundantPolyfill(modulePath: string): boolean {
  // __prelude__: The content of `__prelude__` is passed to esbuild with `define`
  // polyfills/require.js: `require` is already provided by esbuild
  return /(?:__prelude__|[/\\]polyfills[/\\]require.js)$/.test(modulePath);
}

function outputOf(module: Module | undefined): string | undefined {
  return module?.output?.map(({ data }) => (data as any).code).join("\n");
}

/**
 * Metro wraps each module inside
 * `__d((global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) => {})`.
 * This function attempts to remove the wrapper.
 *
 * @see https://github.com/facebook/metro/blob/4ccb059351313f78bc0b1f4419e6ff85dc911514/packages/metro-runtime/src/polyfills/require.js#L68
 *
 * @param code Code wrapped by Metro
 * @returns Unwrapped code
 */
function unwrap(code: string): string {
  if (!code.startsWith("__d(")) {
    return code;
  }

  const lines = code.split("\n");
  if (lines.length < 3) {
    return code;
  }

  lines.pop();
  lines.shift();
  return lines.join("\n");
}

/**
 * esbuild bundler for Metro.
 */
export function MetroSerializer(
  plugins: MetroPlugin[] = [],
  buildOptions?: Options
): Serializer {
  // TODO: This should be bumped to the version that contains all the changes
  // we'll need for this plugin to work.
  assertVersion(">=0.64.0");

  return (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ): Promise<string> => {
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
            return { contents: unwrap(outputOf(mod) ?? "") };
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
                  .map(({ path }) => `require("${path}");`),

                /**
                 * Ensure that `react-native/Libraries/Core/InitializeCore.js`
                 * gets executed first.
                 */
                ...options.runBeforeMainModule.map(
                  (value) => `require("${value}");`
                ),
              ].join("\n"),
            };
          }

          warn(`No such module: ${args.path}`);
          return { contents: "" };
        });
      },
    };

    const lodashTransformer = require("esbuild-plugin-lodash");

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
        minify: buildOptions?.minify ?? !Boolean(options.dev),
        plugins: [metroPlugin, lodashTransformer()],
        write: false,
      })
      .then(({ outputFiles }: BuildResult) => {
        const output = outputFiles?.[0].text ?? "";
        info("esbuild bundle size:", output.length);
        return output;
      });
  };
}
