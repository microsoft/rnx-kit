# Type Safety

:::danger Draft Content

This page needs to be converted from a draft to real content.

:::

## A Tale of Two Type Systems

Flow and TypeScript.

Flow is used primarily for Meta projects, and though Flow is open-source, their
focus is on Meta's needs. They are not prioritizing community feature requests
or PRs.

The JavaScript community has largely embraced TypeScript, and the react-native
community is following this trend, even though the core code from Meta uses
Flow. TypeScript is actively accepting community contributions.

## Platform-Specific Code

React Native introduced the idea of a platform. This doesn't work with
TypeScript because the primary mechanism is a platform-specific extension baked
into source file names. The TypeScript module resolver does not understand
platform-specific extensions. This means TypeScript cannot accurately check for
type errors on a specific platform.

We are actively engaging with the TypeScript team and have submitted a PR to
enable support for React Native platform-specific extensions. In the interim, we
have built a TypeScript compiler with React Native support which developers can
use in lieu of direct support from TypeScript.

TypeScript support is most beneficial when integrated with an editor like
VSCode. Seeing platform-specific type-safety errors, during development, helps
keep bugs out of the shared source tree.

## Type-Safe Bundling

Integrated TypeScript with Metro to show type errors when bundling or running a
dev server.
