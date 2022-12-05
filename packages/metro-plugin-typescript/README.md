<!--remove-block start-->

# @rnx-kit/metro-plugin-typescript

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-plugin-typescript)](https://www.npmjs.com/package/@rnx-kit/metro-plugin-typescript)

<!--remove-block end-->

`@rnx-kit/metro-plugin-typescript` adds type checking to Metro.

## Usage

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const { TypeScriptPlugin } = require("@rnx-kit/metro-plugin-typescript");

 module.exports = makeMetroConfig({
   serializer: {
+    experimentalSerializerHook: TypeScriptPlugin(),
   },
 });
```

## Options

| Key          | Type    | Default | Description                             |
| :----------- | :------ | :------ | :-------------------------------------- |
| throwOnError | boolean | `false` | Whether to throw when errors are found. |
