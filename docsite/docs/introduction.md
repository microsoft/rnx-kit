# Introduction

React Native engineering is complicated, and the ecosystem changes quickly. The
tools here are purpose-built to give you an exceptional developer experience,
throughout the lifecycle of your React Native apps and libraries.

## Tools? I Like Tools!

Then you're in the right place! There are lots of tools here to help you.

Have you struggled to find the right combination of React Native dependencies
that work well together and are compatible with each other? _And_ that match the
React Native release you're using? There's
[a tool for that](./guides/dependency-management)! It's all automated, too.

Can't use Metro because it doesn't understand symlinks? Yarn, npm, and pmpm all
use symlinks these days. There's
[a tool for that](./tools/metro-resolver-symlinks)! A few lines of
configuration, and you're ready to go.

Do you use Metro and miss the type-safe bundling and bundle-serving in Haul and
Webpack? There's [a tool for that](./guides/bundling)!

This just scratches the surface, and more are being built all the time.

## Using the Tools

Adding tools to a project or monorepo isn't a linear journey, and it won't be
the same for everyone. Each situation is different, and has its own unique
challenges and requirements.

You can use the command-line interface, which is a turn-key solution focused on
common engineering tasks. You can also pick individual tools, integrating them
into your repo wherever they are needed.

### Command-Line Interface

The
[command-line interface](https://github.com/microsoft/rnx-kit/tree/main/packages/cli)
brings many of the tools together to perform common tasks, like bundling and
dependency management. The CLI helps developers get things done from their
terminal, and fits nicely into CI loops and package script blocks.

The CLI is controlled by command-line parameters and
[package configuration](https://github.com/microsoft/rnx-kit/tree/main/packages/config).
Command-line parameters always override default values. Package configuration is optional but
recommended. Configuration is how a package tells the CLI about itself. For
example, a package can describe the options and paths to use during bundling.

```json title='Example configuration in package.json'
{
  "rnx-kit": {
    "kitType": "app",
    "alignDeps": {
      "requirements": ["react-native@0.68"],
      "capabilities": [
        "core-android",
        "core-ios",
        "core-macos",
        "core-windows",
        "react"
      ]
    },
    "bundle": true
  }
}
```

With a configuration in place, you only need command-line parameters to override
specific behaviors.

```bash title='Example commands'
// Only bundle windows, and use a test entry point
$ yarn react-native rnx-bundle --platform windows --entry-path ./src/index-test.ts

// Run a bundle server on an unusual port
$ yarn react-native rnx-start --port 23000

// Run the dependency manager, scanning all packages and targeting React Native 0.68
$ yarn react-native rnx-align-deps --requirements react-native@0.68
```

### Choosing Individual Tools

The tools are designed to be used individually. You can choose
[specific tools](./tools/overview), and use them however and wherever they are
needed. Mix and match with other tools and the CLI.

Each tool has its own TypeScript API. There is plenty of documentation,
including How-To guides and examples to get you going.

Tools are released on their own schedule, as features are added and fixes are
made. Tools have their own test suite to keep quality high. And when you take a
new drop, you can review the change history that is generated from each PR.

## Web

Many of these tools work with web projects, too! Some examples include the
dependency manager and the plugins for Babel and ESLint.
