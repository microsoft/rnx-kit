// @ts-check
"use strict";

describe("@rnx-kit/babel-preset-metro-react-native", () => {
  const babel = require("@babel/core");
  const path = require("node:path");
  const preset = require("../src/index");

  const thisBabelPreset = path.dirname(__dirname);
  const cwd = path.join(__dirname, "__fixtures__");

  const optionsWithAdditionalPlugins = {
    additionalPlugins: [
      "my-extra-plugin",
      ["additional-plugin", { options: {} }],
    ],
  };

  /**
   * @param {string} spec
   * @returns {string}
   */
  function fixture(spec) {
    return path.join(cwd, spec);
  }

  /**
   * @param {string} filename
   * @param {import("@babel/core").TransformOptions} opts
   * @returns {Promise<string>}
   */
  async function transform(filename, opts) {
    const oxfmt = await import("oxfmt");
    const output = babel.transformFileSync(filename, opts);
    const code = output?.code;
    if (!code) {
      fail(`Failed to transform '${filename}'`);
    }

    // Format the code to make the snapshot more legible.
    return (await oxfmt.format(filename, code)).code;
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

  test("forwards options to `@react-native/babel-preset`", async () => {
    const code = await transform(fixture("App.ts"), {
      cwd,
      presets: [[thisBabelPreset, { disableImportExportTransform: true }]],
    });

    expect(code).toMatchSnapshot();
  });

  test("transforms `const enum`s", async () => {
    const code = await transform(fixture("App.ts"), {
      cwd,
      presets: [thisBabelPreset],
    });

    expect(code).toMatchSnapshot();
  });

  test("transforms Flow enums", async () => {
    const code = await transform(fixture("Enum.flow.js"), {
      cwd,
      presets: [thisBabelPreset],
    });

    expect(code).toMatchSnapshot();
  });

  test("transforms Flow enums when import/export transform is disabled", async () => {
    const code = await transform(fixture("Enum.flow.js"), {
      cwd,
      presets: [[thisBabelPreset, { disableImportExportTransform: true }]],
    });

    expect(code).toMatchSnapshot();
  });

  test("applies additional plugins", async () => {
    const code = await transform(fixture("App.ts"), {
      cwd,
      presets: [
        [
          thisBabelPreset,
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

    expect(code).toMatchSnapshot();
  });

  test("can be further extended", async () => {
    const customPreset = () => ({
      presets: [
        [
          thisBabelPreset,
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

    const code = await transform(fixture("App.ts"), {
      cwd,
      presets: [customPreset],
    });

    expect(code).toMatchSnapshot();
  });

  test("passes `loose: true` to `@babel/plugin-transform-classes`", async () => {
    const code = await transform(fixture("Class.ts"), {
      cwd,
      presets: [
        [
          thisBabelPreset,
          {
            disableImportExportTransform: true,
            looseClassTransform: true,
          },
        ],
      ],
    });

    expect(code).toMatchSnapshot();
  });
});
