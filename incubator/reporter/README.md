# @rnx-kit/reporter

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/reporter)](https://www.npmjs.com/package/@rnx-kit/reporter)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

# Overview

This is a common package for logging output to the console and/or logfiles,
timing tasks and operations, and listening for events for task start, finish,
and errors.

It is written as esm, side-effect free, with the functionality separated so that
it will only bring in the portions that are used. The core logger and reporter
functionality can be used on its own, with additional modules provided for
colors, formatting, performance tracking, and cascading reporters through
process trees provided.

All code is self-contained and this has no dependencies.

# Detailed Description
