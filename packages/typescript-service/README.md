<!--remove-block start-->

# @rnx-kit/typescript-service

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typescript-service)](https://www.npmjs.com/package/@rnx-kit/typescript-service)

<!--remove-block end-->

`@rnx-kit/typescript-service` gives you access to TypeScript's language
services, and lets you customize how module resolution occurs.

## Configuration

The starting point for working with TypeScript is reading configuration from the
command line, or from a
[configuration file](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
like `tsconfig.json`.

Both methods yeild a `ParedCommandLine` object, offering the same level of
control over how TypeScript behaves.

```typescript
import ts from "typescript";

// Read configuration from a NodeJS command-line
const cmdLine = ts.parseCommandLine(process.argv.slice(2));

// Read configuration from a project file (parsed into a TypeScript command-line object)
const configFileName = findConfigFile(searchPath);
if (!configFileName) {
  throw new Error(`Failed to find config file under ${searchPath}`);
}
const cmdLine = readConfigFile(configFileName);
if (!cmdLine) {
  throw new Error(`Failed to read config file ${configFileName}`);
}

// For either method, handle errors
if (cmdLine.errors.length > 0) {
  ...
}
```

## Language Services

TypeScript's language service allows you to work with source code continuously,
unlike the TypeScript compiler, which makes a single pass through the code. The
language service tends to load only what is needed to fulfill the current
request, such as getting diagnostics for a particular source file, or re-loading
a changed file being watched. This saves time and memory, when full source
validation isn't needed.

The language service is accessible through the `Service` and `Project` classes.
`Service` manages shared state across all projects, and is meant to be a
singleton. `Project` contains a TypeScript configuration, which includes a list
of source files. TypeScript configuration comes from either the command line or
a file like `tsconfig.json`.

You can use a `Project` to validate code, and emit transpiled JavaScript:

```typescript
const service = new Service();
const project = service.openProject(cmdLine);

// validate
const fileHasErrors = project.validateFile(fileName);
const projectHasErrors = project.validate();

// emit
const fileEmitted = project.emitFile(fileName);
const projectEmitted = project.emit();
```

You can also change which files are in a project. This is typically done in
response to an external event, like a callback notifying you that a file has
been added, updated or removed:

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

When you're finished working with a `Project`, you must `dispose` of it to
properly release all internal resources:

```typescript
project.dispose();
```

## Customizing the Language Service

The language service is initialized using a host interface. You can customize
the host interface to change the way TypeScript works:

```typescript
const enhanceLanguageServiceHost = (host: ts.LanguageServiceHost): void => {
  // change host functions in here
};

const service = new Service();
const project = service.openProject(cmdLine, enhanceLanguageServiceHost);
```

For example, you can replace the functions which control how modules and type
references are resolved to files:

```typescript
function resolveModuleNames(
  moduleNames: string[],
  containingFile: string,
  reusedNames: string[] | undefined,
  redirectedReference: ResolvedProjectReference | undefined,
  options: CompilerOptions
): (ResolvedModule | undefined)[] {
  /* ... */
}

function resolveTypeReferenceDirectives(
  typeDirectiveNames: string[],
  containingFile: string,
  redirectedReference: ResolvedProjectReference | undefined,
  options: CompilerOptions
): (ResolvedTypeReferenceDirective | undefined)[] {
  /* ... */
}

const enhanceLanguageServiceHost = (host: ts.LanguageServiceHost): void => {
  host.resolveModuleNames = resolveModuleNames;
  host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives;
};
```
