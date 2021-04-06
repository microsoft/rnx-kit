# @rnx-kit/metro-plugin-duplicates-checker

`@rnx-kit/metro-plugin-duplicates-checker` checks for duplicate packages in your
bundle.

## Usage

There are several ways to use this package. You can check for duplicate packages
after a bundle is created:

```js
const {
  checkForDuplicatePackagesInFile,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackagesInFile(pathToSourceMap, {
  ignoredModules: [],
  bannedModules: [],
});
```

If you have a source map object, you can pass that directly to
`checkForDuplicatePackages()`:

```js
const {
  checkForDuplicatePackages,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackages(mySourceMap, {
  ignoredModules: [],
  bannedModules: [],
});
```

## Options

| Key            | Type     | Default | Description                          |
| :------------- | :------- | :------ | :----------------------------------- |
| bannedModules  | string[] | `[]`    | List of modules that are banned.     |
| ignoredModules | string[] | `[]`    | List of modules that can be ignored. |
