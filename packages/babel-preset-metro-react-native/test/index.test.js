// @ts-check
"use strict";

describe("@rnx-kit/babel-preset-metro-react-native", () => {
  const babel = require("@babel/core");
  const path = require("path");
  const prettier = require("prettier");
  const preset = require("../src/index");

  test("returns default Babel preset with one additional TypeScript plugin", () => {
    expect(preset(undefined)).toEqual({
      presets: ["module:metro-react-native-babel-preset"],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: ["const-enum"],
        },
      ],
    });
  });

  test("returns preset with additional TypeScript plugins", () => {
    const opts = {
      additionalPlugins: [
        "my-extra-plugin",
        ["additional-plugin", { options: {} }],
      ],
    };
    expect(preset(undefined, opts)).toEqual({
      presets: ["module:metro-react-native-babel-preset"],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: ["const-enum", ...opts.additionalPlugins],
        },
      ],
    });
  });

  test("applies `babel-plugin-const-enum`", () => {
    const cwd = path.join(__dirname, "__fixtures__");
    const app = path.join(cwd, "App.ts");

    expect(() =>
      babel.transformFileSync(app, {
        cwd,
        presets: ["module:metro-react-native-babel-preset"],
      })
    ).toThrowError("'const' enums are not supported");

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
