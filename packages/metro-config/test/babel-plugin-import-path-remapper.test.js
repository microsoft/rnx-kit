describe("@rnx-kit/metro-config/src/babel-plugin-import-path-remapper", () => {
  const babel = require("@babel/core");

  /**
   * Transforms the specified code.
   * @param {string} code
   * @returns {string}
   */
  function transform(code) {
    const result = babel.transformSync(code, {
      plugins: [
        ["src/babel-plugin-import-path-remapper.js", { scope: "@rnx-kit" }]
      ]
    });
    return result.code;
  }

  test("leaves unmatched import/export statements", () => {
    [
      `export * from "@contoso/example/lib/index";`,
      `export { a, b } from "@contoso/example/lib/index";`,
      `import * as Example from "@contoso/example/lib/index";`,
      `import { a, b } from "@contoso/example/lib/index";`,
      `import("@contoso/example/lib/index");`,
      `require("@contoso/example/lib/index");`
    ].forEach(code => {
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
});
