import type { Plugin } from "esbuild";

/**
 * The virtual module path used as the synthetic entry-point that injects React
 * Native globals and polyfills before your application code runs.
 *
 * @internal
 */
export const POLYFILLS_VIRTUAL_ENTRY = "rnx-esbuild-polyfills:entry";

/** Namespace used to scope the virtual polyfills module within esbuild. */
const POLYFILLS_NAMESPACE = "rnx-esbuild-polyfills";

/** Filter regex that matches only the virtual entry path. */
const VIRTUAL_ENTRY_FILTER = /^rnx-esbuild-polyfills:entry$/;

/**
 * Options for the React Native polyfills plugin.
 */
export type PolyfillsPluginOptions = {
  /**
   * The real entry file path (e.g. `index.js`).
   */
  entryFile: string;

  /**
   * Whether bundling in development mode. When `true`, `__DEV__` is set to
   * `true` in the output; otherwise `false`.
   */
  dev: boolean;

  /**
   * Additional polyfill module paths to `require()` before the entry file.
   * These are executed in the order provided.
   */
  polyfills?: string[];
};

/**
 * An esbuild plugin that injects the React Native global scope setup and any
 * extra polyfills as a virtual entry-point module.
 *
 * **What this replaces from Metro:**
 * - Metro's `preModules` (pre-bundle initialization modules such as
 *   `InitializeCore.js`, error guard polyfills, etc.).
 * - Metro's `__prelude__` virtual module that sets up `global` and
 *   `__METRO_GLOBAL_PREFIX__`.
 * - The `runBeforeMainModule` option in Metro's serializer that ensures
 *   `InitializeCore.js` runs before user code.
 *
 * The plugin works by redirecting esbuild to use a synthetic virtual module as
 * the entry-point. This virtual module:
 *  1. Sets `global` to `globalThis` (React Native modules assume `global`
 *     is the global object, which is not guaranteed in strict ES environments).
 *  2. Requires any additional `polyfills` supplied by the caller.
 *  3. Finally, requires the real entry file.
 *
 * @param options Plugin configuration.
 */
export function reactNativePolyfills(
  options: PolyfillsPluginOptions
): Plugin {
  const { entryFile, dev, polyfills = [] } = options;

  function escapePath(p: string): string {
    return p.replace(/\\/g, "\\\\");
  }

  const virtualContents = [
    // Ensure `global` is available as React Native modules rely on it.
    'var global = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : new Function("return this;")();',

    // Expose __DEV__ as a global so it is available without bundler define
    // transforms (though we also pass it via esbuild `define`).
    `var __DEV__ = ${JSON.stringify(dev)};`,

    // Additional polyfills
    ...polyfills.map((p) => `require("${escapePath(p)}");`),

    // Entry file - must always be last.
    `require("${escapePath(entryFile)}");`,
  ].join("\n");

  return {
    name: "@rnx-kit/esbuild-service:react-native-polyfills",
    setup(build) {
      const { initialOptions } = build;

      // Redirect the original entry point to the virtual polyfills module.
      const originalEntry = initialOptions.entryPoints;
      if (Array.isArray(originalEntry)) {
        initialOptions.entryPoints = [POLYFILLS_VIRTUAL_ENTRY];
      }

      build.onResolve({ filter: VIRTUAL_ENTRY_FILTER }, () => ({
        path: POLYFILLS_VIRTUAL_ENTRY,
        namespace: POLYFILLS_NAMESPACE,
      }));

      build.onLoad(
        { filter: VIRTUAL_ENTRY_FILTER, namespace: POLYFILLS_NAMESPACE },
        () => ({
          contents: virtualContents,
          resolveDir: process.cwd(),
        })
      );
    },
  };
}
