<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/test-fixtures

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/test-fixtures)](https://www.npmjs.com/package/@rnx-kit/test-fixtures)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Shared test fixtures for the `rnx-kit` monorepo. Provides a common set of
source files that can be used across packages for testing parsers, formatters,
bundlers, and other tools.

## Motivation

Many packages in the repo need realistic source files to test against. Instead of
each package maintaining its own copy of test inputs, this package provides a
single curated collection with a simple API for accessing them.

## Installation

```sh
yarn add @rnx-kit/test-fixtures --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/test-fixtures
```

## Usage

```typescript
import { getFixtures } from "@rnx-kit/test-fixtures";

// Get a fixture set by name
const lang = getFixtures("language");
const realworld = getFixtures("realworld");

// List available fixture files
console.log(lang.files); // ["arrow-function-input.js", ...]

// Read a fixture synchronously
const src = lang.getSrc("arrow-function-input.js");

// Read a fixture asynchronously
const src = await lang.getSrcAsync("arrow-function-input.js");

// Get the directory path (useful for tools that need a file path)
console.log(lang.dir);
```

## API

### `getFixtures(set: FixtureSetName): FixtureSet`

Returns a `FixtureSet` for the given set name. The result is memoised — calling
it again with the same name returns the same instance.

#### Fixture set names

| Name          | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `"language"`  | Synthetic JS/TS snippets covering various language constructs   |
| `"realworld"` | Real-world source files taken from production React Native code |

### `FixtureSet`

| Member                                       | Description                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| `dir: string`                                | Absolute path to the fixture directory                       |
| `files: string[]`                            | List of filenames in the set                                 |
| `getSrc(file: string): string`               | Read a fixture file synchronously (cached after first read)  |
| `getSrcAsync(file: string): Promise<string>` | Read a fixture file asynchronously (cached after first read) |
