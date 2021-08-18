# @rnx-kit/tools-language

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-language)](https://www.npmjs.com/package/@rnx-kit/tools-language)

`@rnx-kit/tools-language` is a collection of supplemental JavaScript functions
and types.

| Category | Function                                  | Description                                                                                                                                    |
| -------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Function | `tryInvoke(fn)`                           | Invoke the given function, returning its result or a thrown error.                                                                             |
| Math     | `isApproximatelyEqual(f1, f2, tolerance)` | Decide if two numbers, integer or decimal, are "approximately" equal. They're equal if they are close enough to be within the given tolerance. |
