// @ts-check
"use strict";

describe("@rnx-kit/babel-preset-metro-react-native", () => {
  const babel = require("@babel/core");
  const path = require("path");
  const prettier = require("prettier");
  const preset = require("../src/index");

  const optionsWithAdditionalPlugins = {
    additionalPlugins: [
      "my-extra-plugin",
      ["additional-plugin", { options: {} }],
    ],
  };

  /**
   *
   * @param {string} filename
   * @param {import("@babel/core").TransformOptions} opts
   * @returns {string | null}
   */
  function transform(filename, opts) {
    const output = babel.transformFileSync(filename, opts);
    return output?.code
      ? // Format the code to make the snapshot more legible.
        prettier.format(output.code, { parser: "babel" })
      : null;
  }

  afterEach(() => {
    jest.unmock("@babel/plugin-transform-typescript/package.json");
  });

  test("returns default Babel preset with one additional TypeScript plugin (<7.15)", () => {
    jest.mock("@babel/plugin-transform-typescript/package.json", () => ({
      version: "7.14.5",
    }));

    expect(preset()).toEqual(
      expect.objectContaining({
        overrides: expect.arrayContaining([
          {
            test: /\.tsx?$/,
            plugins: [expect.stringContaining("babel-plugin-const-enum")],
          },
        ]),
      })
    );
  });

  test("returns default Babel preset with one additional TypeScript plugin (>=7.15)", () => {
    expect(preset()).toEqual(
      expect.objectContaining({
        overrides: expect.arrayContaining([
          {
            test: /\.tsx?$/,
            plugins: [],
          },
        ]),
      })
    );
  });

  test("returns preset with additional TypeScript plugins (<7.15)", () => {
    jest.mock("@babel/plugin-transform-typescript/package.json", () => ({
      version: "7.14.5",
    }));

    expect(preset(undefined, optionsWithAdditionalPlugins)).toEqual(
      expect.objectContaining({
        overrides: expect.arrayContaining([
          {
            test: /\.tsx?$/,
            plugins: [
              expect.stringContaining("babel-plugin-const-enum"),
              ...optionsWithAdditionalPlugins.additionalPlugins,
            ],
          },
        ]),
      })
    );
  });

  test("returns preset with additional TypeScript plugins (>=7.15)", () => {
    expect(preset(undefined, optionsWithAdditionalPlugins)).toEqual(
      expect.objectContaining({
        overrides: expect.arrayContaining([
          {
            test: /\.tsx?$/,
            plugins: optionsWithAdditionalPlugins.additionalPlugins,
          },
        ]),
      })
    );
  });

  test("forwards options to `metro-react-native-babel-preset`", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const code = transform(app, {
      cwd,
      presets: [
        [
          "@rnx-kit/babel-preset-metro-react-native",
          { disableImportExportTransform: true },
        ],
      ],
    });

    if (!code) {
      fail("Failed to transform `App.ts`");
    }

    expect(code).toMatchSnapshot();
  });

  test("transforms `const enum`s", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const code = transform(app, {
      cwd,
      presets: ["@rnx-kit/babel-preset-metro-react-native"],
    });

    if (!code) {
      fail("Failed to transform `App.ts`");
    }

    expect(code).toMatchSnapshot();
  });

  test("applies additional plugins", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const code = transform(app, {
      cwd,
      presets: [
        [
          "@rnx-kit/babel-preset-metro-react-native",
          {
            additionalPlugins: [
              [
                "@rnx-kit/babel-plugin-import-path-remapper",
                { test: () => true },
              ],
            ],
          },
        ],
      ],
    });

    if (!code) {
      fail("Failed to transform `App.ts`");
    }

    expect(code).toMatchSnapshot();
  });

  test("can be further extended", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const customPreset = () => ({
      presets: [
        [
          "@rnx-kit/babel-preset-metro-react-native",
          {
            additionalPlugins: [
              [
                "@rnx-kit/babel-plugin-import-path-remapper",
                { test: () => true },
              ],
            ],
          },
        ],
      ],
    });

    const code = transform(app, {
      cwd,
      presets: [customPreset],
    });

    if (!code) {
      fail("Failed to transform `App.ts`");
    }

    expect(code).toMatchSnapshot();
  });

  test("passes `loose: true` to `@babel/plugin-transform-classes`", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "Class.ts");

    const code = transform(app, {
      cwd,
      presets: [
        [
          "@rnx-kit/babel-preset-metro-react-native",
          {
            disableImportExportTransform: true,
            looseClassTransform: true,
          },
        ],
      ],
    });

    if (!code) {
      fail("Failed to transform `Class.ts`");
    }

    expect(code).toMatchSnapshot();
  });
});
