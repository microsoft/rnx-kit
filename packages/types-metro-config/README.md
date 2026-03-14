# @rnx-kit/types-metro-config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)

Shared TypeScript types for `rnx-kit` Metro plugins and configuration. This is
an internal package used by `@rnx-kit/metro-transformer`,
`@rnx-kit/metro-serializer`, and related packages.

## Types

### Serializer types

#### `SerializerPlugin<T>`

A Metro serializer plugin. Called once per bundle with the full module graph
before serialization. Use this to inspect or validate bundle contents.

```ts
type SerializerPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: readonly Module<T>[],
  graph: ReadOnlyGraph<T>,
  options: SerializerOptions<T>
) => void;
```

#### `SerializerHookPlugin<T>`

A serializer hook plugin. Called on every delta with the full module graph and
the delta result.

#### `CustomSerializer`

Signature of a Metro custom serializer, as set on
`serializer.customSerializer` in the Metro config.

#### `CustomSerializerResult`

The value returned by a Metro custom serializer — either a raw code string or
an object with separate code and source-map strings.

#### `Bundle`

Intermediate bundle representation produced by Metro's `baseJSBundle`.

### Transformer types

#### `ExtendedTransformerConfig`

Extends Metro's `TransformerConfigT` with additional options:

- **`babelTransformers`** — `Record<string, string>` — Maps glob patterns to
  paths of Babel transformers. Patterns are matched with
  [micromatch](https://github.com/micromatch/micromatch) against the full file
  path.
- **`upstreamBabelOverridePath`** — `string` — Path to a Babel transformer to
  use as the upstream fallback instead of
  `@react-native/metro-babel-transformer`. When set, delegate transformers that
  internally require `@react-native/metro-babel-transformer` are redirected to
  this path.
- **`customTransformerOptions`** — `Record<string, unknown>` — Arbitrary
  options merged into `customTransformOptions` and forwarded to every Babel
  transformer.

#### `CustomTransformerOptions`

Options set up as part of the `customTransformOptions` passed to Babel
transformers at transform time:

- **`upstreamTransformerPath`** — resolved path to the upstream Babel
  transformer
- **`upstreamTransformerAliases`** — module paths to reroute to the upstream
  transformer
- **`babelTransformers`** — conditional transformer map from the config

#### `TransformerPlugin`

A plugin object that contributes transformer configuration:

- **`transformer`** — `ExtendedTransformerConfig` — config settings to merge

### Plugin factory types

#### `SerializerPluginFactory<TOptions, T>`

Default export shape for a serializer plugin package.

#### `SerializerHookPluginFactory<TOptions, T>`

Default export shape for a serializer hook plugin package.

#### `TransformerPluginFactory<TOptions>`

Default export shape for a transformer plugin package.
