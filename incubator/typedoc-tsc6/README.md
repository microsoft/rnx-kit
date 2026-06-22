# @rnx-kit/typedoc-tsc6

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typedoc-tsc6)](https://www.npmjs.com/package/@rnx-kit/typedoc-tsc6)

This is a package for forcing TypeDoc to use TypeScript 6.0.

## Motivation

Normally, TypeDoc will use whatever TypeScript version is installed. However,
TypeDoc does not yet support 7.0 and we want to use 7.0 because it's faster.

## Installation

This package is not meant for public use. It is only used internally, by
`scripts/src/commands/updateApiReadme.js`.
