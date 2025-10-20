import esbuild from "esbuild";
import { doesNotMatch, match } from "node:assert/strict";
import { describe, it } from "node:test";
import ImportPathRemapperPlugin from "../src/index.ts";

describe("@rnx-kit/esbuild-plugin-import-path-remapper", () => {
  it("remaps main imports from lib to src.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("remaps import paths from lib to src.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-lib-test.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/file"/);
    doesNotMatch(output, /location = "lib\/file"/);
  });

  it("leaves unmatched import/export statements.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin("@unknown")],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "lib\/index"/);
    doesNotMatch(output, /location = "src\/index"/);
  });

  it("remaps main imports with trailing slash", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-slash.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("remaps lib imports when using require.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/require-@test-pkg-lib-test.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/file"/);
    doesNotMatch(output, /location = "lib\/file"/);
  });

  it("remaps main imports from lib to src when using require.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/require-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("remaps export declarations.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/export-@test-pkg.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("remaps main imports from lib to src with jsx.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-jsx.ts"],
      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("remaps importing index from lib.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg-lib-index.ts"],

      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });

  it("does not remap externals.", async () => {
    const result = await esbuild.build({
      entryPoints: ["./test/__fixtures__/import-@test-pkg.ts"],

      bundle: true,
      write: false,
      plugins: [ImportPathRemapperPlugin(/@test/)],
      external: ["@test/pkg"],
    });

    const output = String.fromCodePoint(...result.outputFiles[0].contents);
    match(output, /var import_pkg = __require\("@test\/pkg"\);/);
    doesNotMatch(output, /location = "src\/index"/);
    doesNotMatch(output, /location = "lib\/index"/);
  });
});
