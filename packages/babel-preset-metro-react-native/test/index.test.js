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

  afterEach(() => {
    jest.unmock("@babel/plugin-transform-typescript/package.json");
  });

  test("returns default Babel preset with one additional TypeScript plugin (<7.15)", () => {
    jest.mock("@babel/plugin-transform-typescript/package.json", () => ({
      version: "7.14.5",
    }));

    expect(preset()).toEqual({
      presets: [["module:metro-react-native-babel-preset", {}]],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: ["const-enum"],
        },
      ],
    });
  });

  test("returns default Babel preset with one additional TypeScript plugin (>=7.15)", () => {
    expect(preset()).toEqual({
      presets: [["module:metro-react-native-babel-preset", {}]],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: [],
        },
      ],
    });
  });

  test("returns preset with additional TypeScript plugins (<7.15)", () => {
    jest.mock("@babel/plugin-transform-typescript/package.json", () => ({
      version: "7.14.5",
    }));

    expect(preset(undefined, optionsWithAdditionalPlugins)).toEqual({
      presets: [["module:metro-react-native-babel-preset", {}]],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: [
            "const-enum",
            ...optionsWithAdditionalPlugins.additionalPlugins,
          ],
        },
      ],
    });
  });

  test("returns preset with additional TypeScript plugins (>=7.15)", () => {
    expect(preset(undefined, optionsWithAdditionalPlugins)).toEqual({
      presets: [["module:metro-react-native-babel-preset", {}]],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: optionsWithAdditionalPlugins.additionalPlugins,
        },
      ],
    });
  });

  test("forwards options to `metro-react-native-babel-preset`", () => {
    const metroOptions = { disableImportExportTransform: true };

    expect(preset(undefined, metroOptions)).toEqual({
      presets: [["module:metro-react-native-babel-preset", metroOptions]],
      overrides: [{ test: /\.tsx?$/, plugins: [] }],
    });

    expect(
      preset(undefined, {
        ...optionsWithAdditionalPlugins,
        ...metroOptions,
      })
    ).toEqual({
      presets: [["module:metro-react-native-babel-preset", metroOptions]],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: optionsWithAdditionalPlugins.additionalPlugins,
        },
      ],
    });
  });

  test("transforms `const enum`s", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const output = babel.transformFileSync(app, {
      cwd,
      presets: ["@rnx-kit/babel-preset-metro-react-native"],
    });

    if (!output || !output.code) {
      fail("Failed to transform `App.ts`");
    }

    // Format the code to make the snapshot more legible.
    const code = prettier.format(output.code, { parser: "babel" });
    expect(code).toMatchSnapshot();
  });

  test("applies additional plugins", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    const output = babel.transformFileSync(app, {
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

    if (!output || !output.code) {
      fail("Failed to transform `App.ts`");
    }

    // Format the code to make the snapshot more legible.
    const code = prettier.format(output.code, { parser: "babel" });
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

    const output = babel.transformFileSync(app, {
      cwd,
      presets: [customPreset],
    });

    if (!output || !output.code) {
      fail("Failed to transform `App.ts`");
    }

    // Format the code to make the snapshot more legible.
    const code = prettier.format(output.code, { parser: "babel" });
    expect(code).toMatchSnapshot();
  });
});
