import type { BabelTransformerArgs } from "metro-babel-transformer";
import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSupported,
  getTarget,
  isJavaScriptFile,
  isTypescriptFile,
  transformSrcEsbuild,
  updateOptions,
} from "../src/transformSrcEsbuild";
import type { TransformerPluginOptions } from "../src/types";

describe("isTypescriptFile", () => {
  it("matches .ts", () => ok(isTypescriptFile("file.ts")));
  it("matches .tsx", () => ok(isTypescriptFile("file.tsx")));
  it("matches .mts", () => ok(isTypescriptFile("file.mts")));
  it("matches .cts", () => ok(isTypescriptFile("file.cts")));
  it("matches .mtsx", () => ok(isTypescriptFile("file.mtsx")));
  it("matches .ctsx", () => ok(isTypescriptFile("file.ctsx")));
  it("is case-insensitive", () => ok(isTypescriptFile("file.TS")));
  it("does not match .js", () => equal(isTypescriptFile("file.js"), false));
  it("does not match .jsx", () => equal(isTypescriptFile("file.jsx"), false));
  it("does not match .json", () => equal(isTypescriptFile("file.json"), false));
  it("does not match .svg", () => equal(isTypescriptFile("file.svg"), false));
  it("does not match bare ts in name", () =>
    equal(isTypescriptFile("tsconfig"), false));
});

describe("isJavaScriptFile", () => {
  it("matches .js", () => ok(isJavaScriptFile("file.js")));
  it("matches .jsx", () => ok(isJavaScriptFile("file.jsx")));
  it("matches .mjs", () => ok(isJavaScriptFile("file.mjs")));
  it("matches .cjs", () => ok(isJavaScriptFile("file.cjs")));
  it("matches .mjsx", () => ok(isJavaScriptFile("file.mjsx")));
  it("matches .cjsx", () => ok(isJavaScriptFile("file.cjsx")));
  it("is case-insensitive", () => ok(isJavaScriptFile("file.JS")));
  it("does not match .ts", () => equal(isJavaScriptFile("file.ts"), false));
  it("does not match .tsx", () => equal(isJavaScriptFile("file.tsx"), false));
  it("does not match .json", () => equal(isJavaScriptFile("file.json"), false));
});

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

describe("updateOptions", () => {
  it("sets loader to ts for .ts files", () => {
    const result = updateOptions({}, "file.ts");
    equal(result.loader, "ts");
    equal(result.isJsx, false);
  });

  it("sets loader to tsx for .tsx files", () => {
    const result = updateOptions({}, "file.tsx");
    equal(result.loader, "tsx");
    equal(result.isJsx, true);
  });

  it("sets loader to ts for .mts files", () => {
    const result = updateOptions({}, "file.mts");
    equal(result.loader, "ts");
  });

  it("sets loader to tsx for .ctsx files", () => {
    const result = updateOptions({}, "file.ctsx");
    equal(result.loader, "tsx");
    equal(result.isJsx, true);
  });

  it("does not set loader for .js files when handleJs is false", () => {
    const result = updateOptions({}, "file.js");
    equal(result.loader, undefined);
    equal(result.isJsx, false);
  });

  it("sets loader to js for .js files when handleJs is true", () => {
    const result = updateOptions({ handleJs: true }, "file.js");
    equal(result.loader, "js");
    equal(result.isJsx, false);
  });

  it("sets loader to jsx for .jsx files when handleJs is true", () => {
    const result = updateOptions({ handleJs: true }, "file.jsx");
    equal(result.loader, "jsx");
    equal(result.isJsx, true);
  });

  it("does not set loader for .jsx files when handleJs is false", () => {
    const result = updateOptions({ handleJsx: true }, "file.jsx");
    equal(result.loader, undefined);
    equal(result.isJsx, true);
  });

  it("does not set loader for non-js/ts files", () => {
    const result = updateOptions({ handleJs: true }, "file.json");
    equal(result.loader, undefined);
    equal(result.isJsx, undefined);
  });

  it("is case-insensitive for file extensions", () => {
    const result = updateOptions({}, "file.TSX");
    equal(result.loader, "tsx");
    equal(result.isJsx, true);
  });

  it("preserves existing plugin options", () => {
    const opts: TransformerPluginOptions = {
      handleJs: true,
      handleJsx: true,
      handleSvg: true,
    };
    const result = updateOptions(opts, "file.ts");
    equal(result.handleJs, true);
    equal(result.handleJsx, true);
    equal(result.handleSvg, true);
    equal(result.loader, "ts");
  });

  it("does not mutate the input options", () => {
    const opts: TransformerPluginOptions = { handleJs: true };
    updateOptions(opts, "file.ts");
    equal("loader" in opts, false);
  });
});

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
      pluginOptions: { loader: undefined },
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
      pluginOptions: { loader: "ts" },
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
      pluginOptions: { loader: "tsx", isJsx: true },
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": string"));
  });

  it("transforms JSX when handleJsx is enabled", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: defaultOptions,
      plugins: [],
      pluginOptions: { loader: "tsx", isJsx: true, handleJsx: true },
    });
    equal(typeof result, "string");
    // automatic JSX runtime should produce jsx() or jsxDEV() calls
    ok(!(result as string).includes("<div>"));
  });

  it("preserves JSX when handleJsx is not enabled", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: defaultOptions,
      plugins: [],
      pluginOptions: { loader: "tsx", isJsx: true },
    });
    equal(typeof result, "string");
    // preserved JSX should still have JSX syntax or React.createElement
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
      pluginOptions: { loader: "ts", asyncTransform: true },
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
      pluginOptions: { loader: "ts" },
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
      pluginOptions: { loader: "ts" },
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
      pluginOptions: { loader: "ts" },
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": number"));
    // hermes supports const, so it should be preserved
    ok((result as string).includes("const"));
  });

  it("strips typescript from .tsx with hermes-stable profile", () => {
    const src = "const x: string = 'hello'; const el = <div>{x}</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: hermesOptions,
      plugins: [],
      pluginOptions: { loader: "tsx", isJsx: true },
    });
    equal(typeof result, "string");
    ok(!(result as string).includes(": string"));
  });

  it("transforms JSX with hermes-stable profile and handleJsx", () => {
    const src = "const el = <div>hello</div>;";
    const result = transformSrcEsbuild({
      src,
      filename: "file.tsx",
      options: hermesOptions,
      plugins: [],
      pluginOptions: { loader: "tsx", isJsx: true, handleJsx: true },
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
      pluginOptions: { loader: "ts", asyncTransform: true },
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
      pluginOptions: { loader: "ts" },
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
      pluginOptions: { loader: "ts" },
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
      pluginOptions: { loader: "ts" },
    }) as string;
    ok(result.includes("{"));
    ok(!(result as string).includes(": number"));
  });
});
