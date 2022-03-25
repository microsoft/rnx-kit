# Introduction

React Native engineering is complicated, and the ecosystem changes quickly. The
tools here are purpose-built to give you an exceptional developer experience,
throughout the lifecycle of your React Native apps and libraries.

## Using the Tools

Adding tools to a project or monorepo isn't a linear journey, and it won't be
the same for everyone. Each situation is different, and has its own unique
challenges and requirements.

There are two paths you can follow: command-line interface, and á la carte.

### Command-Line Interface

The most convenient way to go is the
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli).
It brings many of the tools together to perform common tasks, like bundling and
dependency management. The CLI helps developers get things done from their
terminal, and fits nicely into CI loops and package script blocks.

The CLI is controlled by command-line parameters and
[package configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config).
Command-line parameters are optional, but always take predecedence. Think of
them as overrides. Package configuration is _also_ optional, though it is
recommended. Configuration is how a package tells the CLI about itself. For
example, a package can describe the options and paths to use during bundling.

```bash title='Example commands'
$ yarn react-native rnx-bundle --platform windows --entry-path ./src/index.ts

$ yarn react-native rnx-start --project-root ./src

$ yarn react-native rnx-dep-check --vigilant 0.66
```

### Á la carte

The tools are designed to be used individually, as well. Each has its own API,
test suite, and change history. You can pick and choose the specific tools you
need, and use them independently.

Tools come with How-To guides, API documentation, and examples. Some even have
notes on architectural choices. Each tool is released individually, as features
are added and fixes are made.

### Web

Many of these tools work with web projects, too! Some examples include the
dependency manager and the plugins for Babel and ESLint.
