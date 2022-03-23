# @rnx-kit/react-native-lazy-index

## 2.1.7

### Patch Changes

- 4a2bd9a: Moved `react-native-lazy-index` into its new home

## [2.1.6](https://github.com/microsoft/react-native-lazy-index/compare/2.1.5...2.1.6) (2022-03-15)

### Bug Fixes

- **deps:** update babel monorepo to v7.17.7 ([#229](https://github.com/microsoft/react-native-lazy-index/issues/229)) ([f857828](https://github.com/microsoft/react-native-lazy-index/commit/f857828cc8fd63ce527b355e5d85fa867106d394))

## [2.1.5](https://github.com/microsoft/react-native-lazy-index/compare/2.1.4...2.1.5) (2022-01-28)

### Bug Fixes

- **deps:** update babel monorepo ([#209](https://github.com/microsoft/react-native-lazy-index/issues/209)) ([0787860](https://github.com/microsoft/react-native-lazy-index/commit/07878609186ad8c871baf0eb124f4d3431a560fa))

## [2.1.4](https://github.com/microsoft/react-native-lazy-index/compare/2.1.3...2.1.4) (2021-12-06)

### Bug Fixes

- **deps:** update dependency @babel/parser to v7.16.4 ([#190](https://github.com/microsoft/react-native-lazy-index/issues/190)) ([970ecc2](https://github.com/microsoft/react-native-lazy-index/commit/970ecc28635901795e9c659fb4f387ce540fc6a6))

## [2.1.3](https://github.com/microsoft/react-native-lazy-index/compare/2.1.2...2.1.3) (2021-11-15)

### Bug Fixes

- **deps:** update babel monorepo to v7.16.3 ([#180](https://github.com/microsoft/react-native-lazy-index/issues/180)) ([bd427c1](https://github.com/microsoft/react-native-lazy-index/commit/bd427c1383cef2067b5d7a6920ce7e4e1f8eefb7))

## [2.1.2](https://github.com/microsoft/react-native-lazy-index/compare/2.1.1...2.1.2) (2021-10-11)

### Bug Fixes

- **deps:** update babel monorepo to v7.15.8 ([#153](https://github.com/microsoft/react-native-lazy-index/issues/153)) ([e73428d](https://github.com/microsoft/react-native-lazy-index/commit/e73428d4a049cdc62f9f55c9f8874db30306de24))

## [2.1.1](https://github.com/microsoft/react-native-lazy-index/compare/2.1.0...2.1.1) (2021-05-07)

### Bug Fixes

- ensure only JS files are parsed ([#20](https://github.com/microsoft/react-native-lazy-index/issues/20)) ([4b966f6](https://github.com/microsoft/react-native-lazy-index/commit/4b966f682d0daa8d5abc4c3c64c71be36b9ac17b))

## [2.1.0](https://github.com/microsoft/react-native-lazy-index/compare/2.0.0...2.1.0) (2021-04-25)

### Features

- manually declare entry points to skip scanning ([#19](https://github.com/microsoft/react-native-lazy-index/issues/19)) ([287d616](https://github.com/microsoft/react-native-lazy-index/commit/287d61602cc7439debbdc21cc85a5c635c6b7abb))

## [2.0.0](https://github.com/microsoft/react-native-lazy-index/compare/1.0.3...2.0.0) (2020-12-09)

### Features

- Automagically load experiences on demand ([#14](https://github.com/microsoft/react-native-lazy-index/issues/14)) ([2444d45](https://github.com/microsoft/react-native-lazy-index/commit/2444d45cc2cbd78e1aec79a068a334501859a1cd))

### BREAKING CHANGES

- `ReactExperienceLoader.load()` has been removed.

  Modules registered using `AppRegistry` or `BatchedBridge` are now
  automatically loaded on demand. The configuration schema has also
  been changed to reflect this.

## [1.0.3](https://github.com/microsoft/react-native-lazy-index/compare/1.0.2...1.0.3) (2020-11-12)

### Bug Fixes

- Bump babel-plugin-codegen to 4.0.1 ([#11](https://github.com/microsoft/react-native-lazy-index/issues/11)) ([3d2dceb](https://github.com/microsoft/react-native-lazy-index/commit/3d2dceb39cb8a850a0106ff06075cad8d77dbcdc))
