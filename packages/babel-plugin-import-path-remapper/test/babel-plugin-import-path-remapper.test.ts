import babel from "@babel/core";
import { equal, throws } from "node:assert/strict";
import { createRequire } from "node:module";
import { after, afterEach, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("@rnx-kit/babel-plugin-import-path-remapper", () => {
  const currentWorkingDir = process.cwd();
  const pluginUrl = new URL("../src/index.js", import.meta.url);

  let globalRequire = global.require;

  /**
   * Returns whether requested source is in @rnx-kit scope.
   */
  function isRNXKit(source: string): boolean {
    return source.startsWith("@rnx-kit/");
  }

  /**
   * Transforms the specified code.
   */
  function transform(
    code: string,
    options: unknown | undefined = { test: isRNXKit }
  ): string | null | undefined {
    const plugin = fileURLToPath(pluginUrl);
    const result = babel.transformSync(code, { plugins: [[plugin, options]] });
    return result?.code;
  }

  before(() => {
    globalRequire = createRequire(pluginUrl);
  });

  afterEach(() => {
    process.chdir(currentWorkingDir);
  });

  after(() => {
    global.require = globalRequire;
  });

  it("throws if no test function is specified", () => {
    throws(() => transform("", {}), "Expected option `test` to be a function");
  });

  it("throws if remap is not a function", () => {
    throws(
      () => transform("", { test: isRNXKit, remap: "error" }),
      "Expected option `remap` to be undefined or a function"
    );
  });

  it("leaves unmatched import/export statements", () => {
    const cases = [
      "export const zero = () => 0;",
      `export * from "@contoso/example/lib/index";`,
      `export { a, b } from "@contoso/example/lib/index";`,
      `import * as Example from "@contoso/example/lib/index";`,
      `import { a, b } from "@contoso/example/lib/index";`,
      `import("@contoso/example/lib/index");`,
      `require("@contoso/example/lib/index");`,
      `require("fs").readFileSync("@contoso/example/lib/index");`,
    ] as const;
    for (const code of cases) {
      equal(transform(code), code);
    }
  });

  it("remaps require() calls", () => {
    equal(
      transform(`require("@rnx-kit/example/lib/index");`),
      `require("@rnx-kit/example/src/index");`
    );
  });

  it("remaps import() calls", () => {
    equal(
      transform(`import("@rnx-kit/example/lib/index");`),
      `import("@rnx-kit/example/src/index");`
    );
  });

  it("remaps import declaration (all)", () => {
    equal(
      transform(`import * as Example from "@rnx-kit/example/lib/index";`),
      `import * as Example from "@rnx-kit/example/src/index";`
    );
  });

  it("remaps import declaration (named)", () => {
    equal(
      transform(`import { a, b } from "@rnx-kit/example/lib/index";`),
      `import { a, b } from "@rnx-kit/example/src/index";`
    );
  });

  it("remaps export declaration (all)", () => {
    equal(
      transform(`export * from "@rnx-kit/example/lib/index";`),
      `export * from "@rnx-kit/example/src/index";`
    );
  });

  it("remaps export declaration (named)", () => {
    equal(
      transform(`export { a, b } from "@rnx-kit/example/lib/index";`),
      `export { a, b } from "@rnx-kit/example/src/index";`
    );
  });

  it("remaps `lib` only", () => {
    equal(
      transform(`import A from "@rnx-kit/example/lib";`),
      `import A from "@rnx-kit/example/src";`
    );
  });

  it("ignores subsequent `lib` folders", () => {
    equal(
      transform(`import A from "@rnx-kit/example/lib/index/lib/index";`),
      `import A from "@rnx-kit/example/src/index/lib/index";`
    );
  });

  it("preserves magic comments", () => {
    equal(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example/lib/index");`
      ),
      `import(/* webpackChunkName: "example" */"@rnx-kit/example/src/index");`
    );
  });

  it("uses custom remap function when importing a module without path", () => {
    process.chdir("test/__fixtures__/with-main");
    equal(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example");`,
        {
          test: isRNXKit,
          remap: (moduleName: string, path: string) =>
            `${moduleName}/__mocks__/${path}`,
        }
      ),
      `import(/* webpackChunkName: "example" */"@rnx-kit/example/__mocks__/index.js");`
    );
  });

  it("uses custom remap function when importing a module with path", () => {
    equal(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example/lib/index");`,
        {
          test: isRNXKit,
          remap: (moduleName: string, path: string) =>
            `${moduleName}/__mocks__/${path}`,
        }
      ),
      `import(/* webpackChunkName: "example" */"@rnx-kit/example/__mocks__/lib/index");`
    );
  });
});
