const sdl = require("@microsoft/eslint-plugin-sdl");
const rnx = require("./src");

/**
 * Note that we don't directly use `sdl.configs.required` because:
 *
 *   1. It includes rules for Angular and Electron
 *   2. Its `react` preset conflicts with our direct use of `eslint-plugin-react`
 *
 * https://github.com/microsoft/eslint-plugin-sdl/blob/957996315c80fdadcd1a9f7bb76fc4663d33ef1e/lib/index.js#L47-L54
 */
module.exports = [
  ...sdl.configs.common,
  ...sdl.configs.node,
  ...rnx.configs.strict,
  ...rnx.configs.stylistic,
  {
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      ...sdl.configs.react[0].rules,
    },
  },
];
