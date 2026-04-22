/**
 * This is a copy of `@react-native/jest-preset/jest/assetFileTransformer.js`
 * with modifications for monorepo support (source:
 * https://github.com/facebook/react-native/blob/v0.85.2/packages/jest-preset/jest/assetFileTransformer.js).
 *
 * This file must be excluded from TypeScript otherwise it will crash:
 *
 *     src/assetFileTransformer.js:4:1 - error TS4032: panic: Invalid formatting placeholder
 *
 *     goroutine 1 [running]:
 *     github.com/microsoft/typescript-go/internal/diagnostics.Format.func2({0x102992134?, 0x10236751c?})
 *             github.com/microsoft/typescript-go/internal/diagnostics/diagnostics.go:130 +0xa0
 *     regexp.(*Regexp).ReplaceAllStringFunc.func1({0x5a4e9e6b8580, 0xc2, 0x160}, {0x5a4e9fed7700?, 0x0?, 0x0?})
 *             regexp/regexp.go:578 +0x74
 *     regexp.(*Regexp).replaceAll(0x5a4e9e6b5040, {0x0, 0x0, 0x0}, {0x1029920df, 0x5a}, 0x2, 0x5a4e9ea2bd68)
 *             regexp/regexp.go:616 +0x2d0
 *     regexp.(*Regexp).ReplaceAllStringFunc(0x10365f380?, {0x1029920df?, 0x2?}, 0x2?)
 *             regexp/regexp.go:577 +0x54
 *
 * [Last checked with 7.0.0-dev.20260422.1]
 */
const createCacheKeyFunction =
  require("@jest/create-cache-key-function").default;
const path = require("node:path");

// NOTE: This file used to be at `react-native/jest/assetFileTransformer.js`
// To keep the mock `testUri` paths the same, we create a fake path that outputs the same relative path as before
const basePath = path.resolve(
  require.resolve("react-native/package.json", { paths: [process.cwd()] }),
  "../jest/"
);

module.exports = {
  // Mocks asset requires to return the filename. Makes it possible to test that
  // the correct images are loaded for components. Essentially
  // require('img1.png') becomes `Object { "testUri": 'path/to/img1.png' }` in
  // the Jest snapshot.
  process: (_, filename) => ({
    code: `module.exports = {
      testUri:
        ${JSON.stringify(path.relative(basePath, filename).replaceAll("\\", "/"))}
    };`,
  }),
  getCacheKey: createCacheKeyFunction([__filename]),
};
