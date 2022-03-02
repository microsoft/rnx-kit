// @ts-check
"use strict";

describe("@rnx-kit/esbuild-plugin-import-path-remapper", () => {
  const esbuild = require("esbuild");
  const ImportPathRemapperPlugin = require("../src/index");

  test("remaps main imports from lib to src.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("remaps import paths from lib to src.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-lib-test.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/file"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/file"')
    );
  });

  test("leaves unmatched import/export statements.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin("@unknown")],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "lib/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "src/index"')
    );
  });

  test("remaps main imports with trailing slash", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-slash.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("remaps lib imports when using require.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/require-@test-pkg-lib-test.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/file"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/file"')
    );
  });

  test("remaps main imports from lib to src when using require.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/require-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("remaps export declarations.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/export-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("remaps main imports from lib to src with jsx.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-jsx.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("remaps importing index from lib.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-lib-index.ts"],

      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(expect.stringContaining('location = "src/index"'));
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });

  test("does not remap externals.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],

      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
      external: ["@test/pkg"],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    expect(output).toEqual(
      expect.stringContaining('var import_pkg = __require("@test/pkg");')
    );
    expect(output).toEqual(
      expect.not.stringContaining('location = "src/index"')
    );
    expect(output).toEqual(
      expect.not.stringContaining('location = "lib/index"')
    );
  });
});
