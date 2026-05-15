import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

export type NodeappApi = {
  runApp: (input: unknown) => Promise<unknown>;
  getSample: (name: string) => { input: unknown; output: unknown } | undefined;
  samples: ReadonlyArray<{ name: string; input: unknown; output: unknown }>;
};

export type EvaluateBundleResult = {
  /** The captured `globalThis.__nodeapp` from the bundle. */
  nodeapp: NodeappApi;
  /** Output of `runApp(getSample('small').input)` if a small sample is present. */
  smallOutput?: unknown;
};

/**
 * Load a Metro bundle and evaluate it in a fresh `vm` sandbox. The bundle is
 * expected to populate `globalThis.__nodeapp` with the nodeapp public API
 * (see test_app/entry.js).
 *
 * The bundle file is text-substituted to neutralise `import.meta.url`
 * references that nodeapp's `cli.ts` carries through to the bundle — those
 * tokens are SyntaxErrors when the bundle is run as a script. The pattern
 * matches `import.meta.url` and `import.meta` (no semantic difference at
 * runtime for this fixture: the only use site is a `=== entryUrl` check the
 * harness never wants to fire).
 */
export async function evaluateBundle(
  bundlePath: string
): Promise<EvaluateBundleResult> {
  const absBundlePath = path.resolve(bundlePath);
  let code = await fs.readFile(absBundlePath, "utf8");
  code = code.replace(/import\.meta\.url/g, '""').replace(/import\.meta/g, "({})");

  // Wrap in an async IIFE so any top-level `await` carried over from a
  // bundled source module (e.g. nodeapp's `cli.ts` end-of-file `await main()`)
  // becomes legal syntax inside the script wrapper.
  const wrapped = `(async () => {\n${code}\n})()`;

  // Build a sandbox that provides everything the Metro runtime + nodeapp need.
  // We deliberately expose `require` so node built-in shims work (see
  // test_app/node-shims/*). In an ESM caller `require` doesn't exist; create
  // one anchored to the bundle file's directory.
  const sandboxRequire = createRequire(absBundlePath);
  const exportsObj: Record<string, unknown> = {};
  const moduleObj = { exports: exportsObj };
  const sandbox: Record<string, unknown> = {
    console,
    require: sandboxRequire,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setImmediate,
    clearImmediate,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    performance,
    // CommonJS scaffolding for esbuild-produced IIFE bundles that wrap their
    // entry as `(module, exports) => { ... }`. Metro's standard bundle does
    // not touch these, but the esbuild serializer does.
    exports: exportsObj,
    module: moduleObj,
  };
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  const promise = vm.runInContext(wrapped, sandbox, { filename: absBundlePath });
  await promise;

  const nodeapp = (sandbox as { __nodeapp?: NodeappApi }).__nodeapp;
  if (!nodeapp || typeof nodeapp.runApp !== "function") {
    throw new Error(
      "Bundle did not register `globalThis.__nodeapp` with a runApp function"
    );
  }

  const small = nodeapp.getSample("small");
  const smallOutput = small ? await nodeapp.runApp(small.input) : undefined;

  return { nodeapp, smallOutput };
}
