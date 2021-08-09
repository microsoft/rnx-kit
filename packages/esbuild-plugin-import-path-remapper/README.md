# @rnx-kit/esbuild-plugin-import-path-remapper

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/esbuild-plugin-import-path-remapper)](https://www.npmjs.com/package/@rnx-kit/esbuild-plugin-import-path-remapper)

`@rnx-kit/esbuild-plugin-import-path-remapper` remaps `**/lib/**` imports to
`**/src/**`. This is useful for packages that are not correctly exporting
everything via their `index.ts`, but you still want to consume the TypeScript
files rather than the transpiled JavaScript.

## Usage

Add `@rnx-kit/esbuild-plugin-import-path-remapper` to your build script plugins.
For example, to remap all paths under the `@rnx-kit` scope:

```js
// esbuild.js
require("esbuild")
  .build({
    entryPoints: ["app.tsx"],
    bundle: true,
    outfile: "out.js",
    plugins: [ImportPathRemapperPlugin("@rnx-kit")],
  })
  .catch(() => process.exit(1));
```
