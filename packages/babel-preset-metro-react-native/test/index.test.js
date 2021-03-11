// @ts-check
"use strict";

describe("@rnx-kit/babel-preset-metro-react-native", () => {
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
});
