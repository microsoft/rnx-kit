import { error, info, warn } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { findMetroPath } from "@rnx-kit/tools-react-native/metro";
import { rspack } from "@rspack/core";
import type { SerializerConfigT } from "metro-config";
import { outputOf } from "./module";
import { assertVersion } from "./version";

export type Options = {
  minify?: boolean;
};

export function escapePath(path: string): string {
  return path.replace(/\\+/g, "\\\\");
}

export function isRedundantPolyfill(modulePath: string): boolean {
  // __prelude__: The content of `__prelude__` is passed to Rspack with `define`
  // polyfills/require.js: `require` is already provided by Rspack
  return /(?:__prelude__|[/\\]polyfills[/\\]require.js)$/.test(modulePath);
}

/**
 * Rspack bundler for Metro.
 */
export function MetroSerializer(
  metroPlugins: MetroPlugin[] = [],
  _buildOptions?: Options
): SerializerConfigT["customSerializer"] {
  assertVersion("0.66.1");

  // Signal to all plugins that we're using Rspack.
  process.env["RNX_METRO_SERIALIZER_RSPACK"] = "true";

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

    const compiler = rspack({});

    const { dependencies } = graph;
    compiler.inputFileSystem = {
      readFile: (p, optionsOrCallback, callback) => {
        info("readlink", { p, optionsOrCallback, callback });
        const resolve =
          typeof optionsOrCallback === "function"
            ? optionsOrCallback
            : callback;
        const code = outputOf(dependencies.get(p.toString())) || "";
        resolve(null, code as Buffer & string);
      },
      readlink: (p) => {
        info("readlink", p);
      },
      readdir: (p) => {
        info("readdir", p);
      },
      stat: (p) => {
        info("stat", p);
      },
    };

    compiler.run((err, stats) => {
      if (err || stats?.hasErrors()) {
        if (stats) {
          const info = stats.toJson();
          if (stats.hasWarnings()) {
            warn(info.warnings);
          }
          if (stats.hasErrors()) {
            error(info.errors);
          }
        }
        throw err;
      }
    });
  };
}
