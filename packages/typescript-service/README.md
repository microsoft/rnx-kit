# @rnx-kit/typescript-service

`@rnx-kit/typescript-service` gives you access to TypeScript's language
services, and lets you customize how module resolution occurs.

## Service

`Service` is the starting point for using accessing TypeScript language
services.. A process will typically only need one `Service`.

The `Service` is used to open a `Project`.

```typescript
const service = new Service();

// Find a project file and open it
const project = service.openProject("./", "tsconfig.json");

// Open a project file directly
const project = service.openProjectByFile(path.resolve("./tsconfig.json"));
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
