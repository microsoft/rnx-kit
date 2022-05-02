<!--remove-block start-->

# @rnx-kit/babel-plugin-import-path-remapper

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/babel-plugin-import-path-remapper)](https://www.npmjs.com/package/@rnx-kit/babel-plugin-import-path-remapper)

<!--remove-block end-->

`@rnx-kit/babel-plugin-import-path-remapper` remaps `**/lib/**` imports to
`**/src/**`. This is useful for packages that are not correctly exporting
everything via their `index.ts`, but you still want to consume the TypeScript
files rather than the transpiled JavaScript.

## Usage

Add `@rnx-kit/babel-plugin-import-path-remapper` to your `babel.config.js` under
plugins. For example, to remap all paths under the `@rnx-kit` scope:

```js
// babel.config.js
module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
  overrides: [
    {
      test: /\.tsx?$/,
      plugins: [
        // @babel/plugin-transform-typescript doesn't support `const enum`s.
        // See https://babeljs.io/docs/en/babel-plugin-transform-typescript#caveats
        // for more details.
        "const-enum",

        [
          "@rnx-kit/babel-plugin-import-path-remapper",
          { test: (source) => source.startsWith("@rnx-kit/") },
        ],
      ],
    },
  ],
};
```

Or, if you're using `@rnx-kit/metro-config`:

```js
// babel.config.js
const { makeBabelConfig } = require("@rnx-kit/metro-config");
module.exports = makeBabelConfig([
  [
    "@rnx-kit/babel-plugin-import-path-remapper",
    { test: (source) => source.startsWith("@rnx-kit/") },
  ],
]);
```

### Options

| Option | Type                                           | Description                                                                                                                |
| :----- | :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| test   | `(source: string) => boolean`                  | **[Required]** A function returning whether the passed source should be redirected to another module.                      |
| remap  | `(moduleName: string, path: string) => string` | **[Optional]** A function returning the module that should be used instead, e.g. `contoso/index.js` -> `contoso/index.ts`. |
