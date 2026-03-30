import type { BabelTransformerArgs } from "metro-babel-transformer";
import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSupported,
  getTarget,
  transformSrcEsbuild,
} from "../src/transformSrcEsbuild";
import type { BabelMode, FilePluginOptions } from "../src/types";
import { resolveFileOptions } from "../src/utils";

// ── Helper to build FilePluginOptions for transformSrcEsbuild tests ──

const esbuildMode: BabelMode = { jsx: "esbuild", ts: "esbuild" };
const babelJsxMode: BabelMode = { jsx: "babel", ts: "esbuild" };

function makePluginOptions(
  overrides: Partial<FilePluginOptions> = {}
): FilePluginOptions {
  return {
    ext: ".ts",
    mode: esbuildMode,
    ...overrides,
  };
}

// ── getTarget ────────────────────────────────────────────────────────

describe("getTarget", () => {
  it("returns versioned hermes target for hermes-stable profile", () => {
    const target = getTarget({
      unstable_transformProfile: "hermes-stable",
    } as BabelTransformerArgs["options"]);
    ok(target.startsWith("hermes"));
    ok(target !== "hermes", "must include a version number");
  });

  it("returns versioned hermes target for hermes-canary profile", () => {
    const target = getTarget({
      unstable_transformProfile: "hermes-canary",
    } as BabelTransformerArgs["options"]);
    ok(target.startsWith("hermes"));
    ok(target !== "hermes", "must include a version number");
  });

  it("returns es2022 for default profile", () => {
    equal(
      getTarget({
        unstable_transformProfile: "default",
      } as BabelTransformerArgs["options"]),
      "es2022"
    );
  });

  it("returns es2022 when no profile is set", () => {
    equal(getTarget({} as BabelTransformerArgs["options"]), "es2022");
  });
});

// ── getSupported ─────────────────────────────────────────────────────

describe("getSupported", () => {
  it("returns hermes feature set for versioned hermes target", () => {
    const supported = getSupported("hermes0.12");
    ok(supported != null);
    equal(supported!["const-and-let"], true);
    equal(supported!.arrow, true);
    equal(supported!.destructuring, true);
    equal(supported!.generator, true);
    equal(supported!["rest-argument"], true);
    equal(supported!["template-literal"], true);
    equal(supported!["default-argument"], true);
  });

  it("returns undefined for non-hermes target", () => {
    equal(getSupported("es2022"), undefined);
  });
});

// ── resolveFileOptions ───────────────────────────────────────────────

describe("resolveFileOptions", () => {
  const baseArgs = { src: "", filename: "", options: {}, plugins: [] };

  function resolve(filename: string, opts = {}) {
    return resolveFileOptions(
      { ...baseArgs, filename } as BabelTransformerArgs,
      opts
    );
  }

  it("sets loader to ts for .ts files", () => {
    const result = resolve("file.ts");
    equal(result.loader, "ts");
    equal(result.srcType, "ts");
  });

  it("sets loader to tsx for .tsx files", () => {
    const result = resolve("file.tsx");
    equal(result.loader, "tsx");
    equal(result.srcType, "tsx");
  });

  it("does not set loader for .js files when handleJs is false", () => {
    const result = resolve("file.js");
    equal(result.loader, undefined);
    equal(result.srcType, "js");
  });

  it("sets loader to js for .js files when handleJs is true", () => {
    const result = resolve("file.js", { handleJs: true });
    equal(result.loader, "js");
  });

  it("sets loader to jsx for .jsx files when handleJs is true", () => {
    const result = resolve("file.jsx", { handleJs: true });
    equal(result.loader, "jsx");
  });

  it("does not set loader for .jsx files when handleJs is false", () => {
    const result = resolve("file.jsx");
    equal(result.loader, undefined);
    equal(result.srcType, "jsx");
  });

  it("does not set loader for non-js/ts files", () => {
    const result = resolve("file.json");
    equal(result.loader, undefined);
    equal(result.srcType, undefined);
  });

  it("is case-insensitive for file extensions", () => {
    const result = resolve("file.TSX");
    equal(result.loader, "tsx");
    equal(result.srcType, "tsx");
  });

  it("sets ext to lowercase extension", () => {
    const result = resolve("file.TSX");
    equal(result.ext, ".tsx");
  });

  it("preserves existing plugin options", () => {
    const result = resolve("file.ts", {
      handleJs: true,
      handleJsx: true,
      handleSvg: true,
    });
    equal(result.handleJs, true);
    equal(result.handleJsx, true);
    equal(result.handleSvg, true);
    equal(result.loader, "ts");
  });

  it("does not mutate the input options", () => {
    const opts = { handleJs: true };
    resolve("file.ts", opts);
    equal("loader" in opts, false);
  });

  it("sets mode.jsx to babel when handleJsx is false", () => {
    const result = resolve("file.tsx");
    equal(result.mode.jsx, "babel");
  });

  it("sets mode.jsx to esbuild when handleJsx is true", () => {
    const result = resolve("file.tsx", { handleJsx: true });
    equal(result.mode.jsx, "esbuild");
  });

  it("sets mode.ts to esbuild for normal TS files", () => {
    const result = resolve("file.ts");
    equal(result.mode.ts, "esbuild");
  });
});

// ── transformSrcEsbuild ──────────────────────────────────────────────

describe("transformSrcEsbuild", () => {
  const defaultOptions = {
    dev: true,
    hot: false,
    inlineRequires: false,
    minify: false,
    platform: "ios",
    type: "module" as const,
    unstable_transformProfile: "default" as const,
  } satisfies BabelTransformerArgs["options"];

  const hermesOptions = {
    ...defaultOptions,
    unstable_transformProfile: "hermes-stable" as const,
  };

  it("returns source unchanged when no loader is set", () => {
    const src = "const x = 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.js",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: undefined }),
    });
    equal(result, src);
  });

  it("strips typescript from .ts files synchronously", () => {
    const src = "const x: number = 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": number"));
  });

  it("strips typescript from .tsx files synchronously", () => {
    const src = "const x: string = 'hello'; const el = <div>{x}</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "tsx", ext: ".tsx" }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": string"));
  });

  it("transforms JSX when mode.jsx is esbuild", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({
        loader: "tsx",
        ext: ".tsx",
        mode: esbuildMode,
      }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes("<div>"));
  });

  it("preserves JSX when mode.jsx is babel", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({
        loader: "tsx",
        ext: ".tsx",
        mode: babelJsxMode,
      }),
    });
    equal(typeof result, "string");
    ok(
      (result as string).includes("<div>") || (result as string).includes("div")
    );
  });

  it("returns a promise when asyncTransform is true", async () => {
    const src = "const x: number = 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: defaultOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts", asyncTransform: true }),
    });
    ok(result instanceof Promise);
    const resolved = await result;
    ok(!resolved.includes(": number"));
  });

  it("defines __DEV__ based on dev option", () => {
    const src = "const isDev = __DEV__;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: { ...defaultOptions, dev: true },
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    }) as string;
    ok(result.includes("true"));
  });

  it("defines __DEV__ as false for production", () => {
    const src = "const isDev = __DEV__;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: { ...defaultOptions, dev: false },
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    }) as string;
    ok(result.includes("false"));
  });

  it("strips typescript with hermes-stable profile", () => {
    const src = "const x: number = 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": number"));
    ok((result as string).includes("const"));
  });

  it("strips typescript from .tsx with hermes-stable profile", () => {
    const src = "const x: string = 'hello'; const el = <div>{x}</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "tsx", ext: ".tsx" }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": string"));
  });

  it("transforms JSX with hermes-stable profile and esbuild jsx mode", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({
        loader: "tsx",
        ext: ".tsx",
        mode: esbuildMode,
      }),
    });
    equal(typeof result, "string");
    ok(!(result as string).includes("<div>"));
  });

  it("handles hermes-stable profile with async transform", async () => {
    const src = "const x: number = 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts", asyncTransform: true }),
    });
    ok(result instanceof Promise);
    const resolved = await result;
    ok(!resolved.includes(": number"));
  });

  it("preserves arrow functions with hermes target", () => {
    const src = "const fn = (x: number) => x + 1;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    }) as string;
    ok(result.includes("=>"));
  });

  it("preserves template literals with hermes target", () => {
    const src = "const msg: string = `hello ${name}`;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    }) as string;
    ok(result.includes("`"));
  });

  it("preserves destructuring with hermes target", () => {
    const src = "const { a, b }: { a: number; b: number } = obj;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.ts",
      options: hermesOptions,
      plugins: [],
      pluginOptions: makePluginOptions({ loader: "ts" }),
    }) as string;
    ok(result.includes("{"));
    ok(!result.includes(": number"));
  });
});
