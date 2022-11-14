// @ts-check
"use strict";

describe("@rnx-kit/babel-plugin-import-path-remapper", () => {
  const babel = require("@babel/core");
  const path = require("path");

  const currentWorkingDir = process.cwd();

  /**
   * Returns whether requested source is in @rnx-kit scope.
   * @param {string} source
   * @returns {boolean}
   */
  function isRNXKit(source) {
    return source.startsWith("@rnx-kit/");
  }

  /**
   * Transforms the specified code.
   * @param {string} code
   * @param {unknown=} options
   * @returns {string | null | undefined}
   */
  function transform(code, options = { test: isRNXKit }) {
    const result = babel.transformSync(code, {
      plugins: [[path.join(__dirname, "..", "src", "index.js"), options]],
    });
    return result && result.code;
  }

  afterEach(() => {
    process.chdir(currentWorkingDir);
  });

  test("throws if no test function is specified", () => {
    expect(() => transform("", {})).toThrowError(
      "Expected option `test` to be a function"
    );
  });

  test("throws if remap is not a function", () => {
    expect(() =>
      transform("", { test: isRNXKit, remap: "error" })
    ).toThrowError("Expected option `remap` to be undefined or a function");
  });

  test("leaves unmatched import/export statements", () => {
    [
      "export const zero = () => 0;",
      `export * from "@contoso/example/lib/index";`,
      `export { a, b } from "@contoso/example/lib/index";`,
      `import * as Example from "@contoso/example/lib/index";`,
      `import { a, b } from "@contoso/example/lib/index";`,
      `import("@contoso/example/lib/index");`,
      `require("@contoso/example/lib/index");`,
      `require("fs").readFileSync("@contoso/example/lib/index");`,
    ].forEach((code) => {
      expect(transform(code)).toBe(code);
    });
  });

  test("remaps require() calls", () => {
    expect(transform(`require("@rnx-kit/example/lib/index");`)).toBe(
      `require("@rnx-kit/example/src/index");`
    );
  });

  test("remaps import() calls", () => {
    expect(transform(`import("@rnx-kit/example/lib/index");`)).toBe(
      `import("@rnx-kit/example/src/index");`
    );
  });

  test("remaps import declaration (all)", () => {
    expect(
      transform(`import * as Example from "@rnx-kit/example/lib/index";`)
    ).toBe(`import * as Example from "@rnx-kit/example/src/index";`);
  });

  test("remaps import declaration (named)", () => {
    expect(
      transform(`import { a, b } from "@rnx-kit/example/lib/index";`)
    ).toBe(`import { a, b } from "@rnx-kit/example/src/index";`);
  });

  test("remaps export declaration (all)", () => {
    expect(transform(`export * from "@rnx-kit/example/lib/index";`)).toBe(
      `export * from "@rnx-kit/example/src/index";`
    );
  });

  test("remaps export declaration (named)", () => {
    expect(
      transform(`export { a, b } from "@rnx-kit/example/lib/index";`)
    ).toBe(`export { a, b } from "@rnx-kit/example/src/index";`);
  });

  test("remaps `lib` only", () => {
    expect(transform(`import A from "@rnx-kit/example/lib";`)).toBe(
      `import A from "@rnx-kit/example/src";`
    );
  });

  test("ignores subsequent `lib` folders", () => {
    expect(
      transform(`import A from "@rnx-kit/example/lib/index/lib/index";`)
    ).toBe(`import A from "@rnx-kit/example/src/index/lib/index";`);
  });

  test("preserves magic comments", () => {
    expect(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example/lib/index");`
      )
    ).toBe(
      `import( /* webpackChunkName: "example" */"@rnx-kit/example/src/index");`
    );
  });

  test("uses custom remap function when importing a module without path", () => {
    process.chdir("test/__fixtures__/with-main");
    expect(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example");`,
        {
          test: isRNXKit,
          remap: (
            /** @type {string} */ moduleName,
            /** @type {string} */ path
          ) => `${moduleName}/__mocks__/${path}`,
        }
      )
    ).toBe(
      `import( /* webpackChunkName: "example" */"@rnx-kit/example/__mocks__/index.js");`
    );
  });

  test("uses custom remap function when importing a module with path", () => {
    expect(
      transform(
        `import(/* webpackChunkName: "example" */ "@rnx-kit/example/lib/index");`,
        {
          test: isRNXKit,
          remap: (
            /** @type {string} */ moduleName,
            /** @type {string} */ path
          ) => `${moduleName}/__mocks__/${path}`,
        }
      )
    ).toBe(
      `import( /* webpackChunkName: "example" */"@rnx-kit/example/__mocks__/lib/index");`
    );
  });
});
