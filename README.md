# `rnx-kit` - React Native tooling by and for developers

[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&color=007acc&labelColor=444444&logoColor=007acc)](https://vscode.dev/github/microsoft/rnx-kit)
[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)

`rnx-kit` is a collection of battle-tested tools created by Microsoft engineers
to optimize the React Native developer experience. It helps filling gaps in the
React Native ecosystem and streamlines the developer workflow.

These tools are actively used every day to ship React Native apps at scale
across Microsoft; now they're open source and available for any React Native
project.

## What's included

`rnx-kit` includes tools for:

- Dependency management - Ensure consistent dependency versions across large
  projects with `align-deps`.
- Native builds (experimental) - Build Android and iOS apps in the cloud with
  `build`. Avoid installing heavy native toolchains.
- Better bundling - `metro-serializer` allows the enhancement of Metro to add
  features such as TypeScript validation with Metro, tree shaking, duplicate and
  cyclic dependencies detection.
- Microsoft-tailored defaults - you can find Babel preset for Metro opinionated
  for Microsoft usage.

And many more!

## Get started

Please follow
[Introduction guide](https://microsoft.github.io/rnx-kit/docs/introduction) on
the documentation website to learn about how you can quickly add the "all in
one" CLI to your project and get most of the tools set out of the box.

Or follow the
[Getting started guide](https://microsoft.github.io/rnx-kit/docs/guides/getting-started)
for an easy introduction to our dependency management tool.

If you want to use only a specific tool, you can refer to its `README`` for
details; they are all easily readable in the
[Tools section](https://microsoft.github.io/rnx-kit/docs/tools/overview) of the
documentation.

## Contributing

`rnx-kit` is built for the community, by the community - and maintained by
Microsoft engineers. Your contributions are welcome!

Take a look at
[CONTRIBUTING](https://github.com/microsoft/rnx-kit/tree/main/CONTRIBUTING.md)
for details.

If you are interested in proposing "substantial" changes, please refer to our
[RFC process](https://github.com/microsoft/rnx-kit/tree/rfcs).
