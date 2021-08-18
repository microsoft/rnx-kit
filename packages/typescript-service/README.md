# @rnx-kit/typescript-service

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typescript-service)](https://www.npmjs.com/package/@rnx-kit/typescript-service)

`@rnx-kit/typescript-service` gives you access to TypeScript's language
services, and lets you customize how module resolution occurs.

## Service

`Service` is the starting point for accessing TypeScript language services. A
process will typically only need one `Service`.

The `Service` is used to open a `Project`.

```typescript
const service = new Service();

// Find a project file and read its configuration
const configFileName = service
  .getProjectConfigLoader()
  .find("./", "tsconfig.json");
const config = service.getProjectConfigLoader().load(configFileName);

// Create a resolver host for the project
const resolverHost = createResolverHost(config);

// Open the project
const project = service.openProject(config, resolver);
```

## Resolver Host

`ResolverHost` is the interface which allows TypeScript to ask for module and
type-reference resolution. You provide an implementation specific to your
project.

For example, in a react-native project, your implementation would start with
normal Node resolution and add platform override support for files such as
`foo.ios.ts` and `bar.native.tsx`. It might also add support for out-of-tree
platforms by mapping `react-native` module references to `react-native-windows`
or `react-native-macos`.

```typescript
function createResolverHost(config: ProjectConfig): ResolverHost {
  const defaultResolverHost = createDefaultResolverHost(config);
  return {
    resolveModuleNames: reactNativeModuleResolver,
    getResolvedModuleWithFailedLookupLocationsFromCache:
      defaultResolverHost.getResolvedModuleWithFailedLookupLocationsFromCache.bind(defaultResolverHost),
    resolveTypeReferenceDirectives:
      defaultResolverHost.resolveTypeReferenceDirectives.bind(defaultResolverHost),
  };
}

function reactNativeModuleResolver(...) {
  // ... Node resolution with platform override support and out-of-tree platform support ...
}
```

## Project

`Project` is a TypeScript project, built from a
[configuration file](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
usually named `tsconfig.json`.

A `Project` is a collection of compiler options and source files.

You can use a `Project` to validate source code, ensuring that it is type-safe:

```typescript
// validate one file
const fileHasErrors = project.validateFile(fileName);

// vaidate all files in the project
const projectHasErrors = project.validate();
```

You can manipulate files in the project. This is typically done in response to
an external event, like a callback notifying you that a file has been added,
updated or removed:

```typescript
import ts from "typescript";

function onFileEvent(eventType: string, fileName: string, payload?: string) {
  if (eventType === "add") {
    project.addFile(fileName);
  } else if (eventType === "modify") {
    project.updateFile(
      fileName,
      payload && ts.ScriptSnapshot.fromString(payload)
    );
  } else if (eventType === "delete") {
    project.deleteFile(fileName);
  }
}
```

`Project` only loads source files and type declarations when needed. If you want
to "warm up" the project by pre-loading everything, you can:

```typescript
project.warmup();
```

This will lead to consistently fast validation calls.

When you're finished working with a `Project`, you must `dispose` of it to
properly release all internal resources:

```typescript
project.dispose();
```
