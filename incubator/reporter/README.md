# @rnx-kit/reporter

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/reporter)](https://www.npmjs.com/package/@rnx-kit/reporter)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a common package for logging output to the console and/or logfiles,
timing tasks and operations, and listening for events for task start, finish,
and errors.

It is written as esm, side-effect free, with the functionality separated so that
it will only bring in the portions that are used. The core logger and reporter
functionality can be used on its own, with additional modules provided for
colors, formatting, performance tracking, and cascading reporters through
process trees provided.

All code is self-contained and this has no dependencies.

## Core Components

### 🎯 **Logger (`createLogger`)**

A flexible logging system that supports multiple log levels and custom output
destinations.

```typescript
import { createLogger } from "@rnx-kit/reporter";

const logger = createLogger({
  output: "verbose", // or custom OutputWriter
  prefix: { error: "🚨", warn: "⚠️" },
  onError: (args) => console.error("Error occurred:", args),
});

logger.error("Something went wrong");
logger.warn("This is a warning");
logger.log("General information");
logger.verbose("Detailed debugging info:", myCustomObject);
logger.fatalError("Critical error"); // logs and throws
```

**Features:**

- **Log Levels**: `error`, `warn`, `log`, `verbose` with hierarchical filtering
- **Custom Prefixes**: Add emoji, text, or styling to log messages
- **Error Callbacks**: Handle errors with custom logic
- **Multiple Outputs**: Console, files, or custom destinations

### 📊 **Reporter (`createReporter`)**

A hierarchical task and performance tracking system built on top of the logger.

```typescript
import { createReporter } from "@rnx-kit/reporter";

const reporter = createReporter({
  name: "build-system",
  output: "log",
  reportTimers: true,
});

// Hierarchical task execution
await reporter.task("build", async (buildTask) => {
  buildTask.log("Starting build process...");

  // async functions will time and execute asynchronously
  const result1 = await buildTask.task("compile", async (compileTask) => {
    compileTask.log("Compiling TypeScript...");
    // compilation logic
  });

  // sync functions will execute without yielding to the event loop
  const result2 = buildTask.task("bundle", (bundleTask) => {
    bundleTask.log("Creating bundle...");
    // bundling logic
  });
});

// Operation timing
const result = await reporter.measure("file-processing", async () => {
  // time-sensitive operation
  return processFiles();
});
```

**Features:**

- **Hierarchical Tasks**: Nested task execution with automatic timing
- **Performance Measurement**: Track operation durations and call counts
- **Error Tracking**: Automatic error collection and reporting
- **Event Publishing**: Start/finish/error events via Node.js diagnostics
  channels

### 🎨 **Formatting & Colors**

Rich text formatting with ANSI colors and semantic highlighting.

```typescript
import { getFormatter, createFormatter } from "@rnx-kit/reporter";

const fmt = getFormatter();

// Basic colors
console.log(fmt.red("Error message"));
console.log(fmt.green("Success message"));
console.log(fmt.blue("Info message"));

// Semantic formatting
console.log(fmt.package("@my-scope/package-name"));
console.log(fmt.duration(1250)); // "1.25s"
console.log(fmt.pad("text", 10, "center")); // "   text   "

// Custom formatter
const customFmt = createFormatter({
  highlight1: fmt.magenta,
  durationValue: fmt.yellowBright,
});
```

**Features:**

- **ANSI Colors**: Full 16-color and 256-color support
- **Font Styles**: Bold, dim, italic, underline, strikethrough
- **Semantic Colors**: Package names, durations, highlights, paths
- **Smart Padding**: VT control character-aware text alignment
- **Auto-detection**: Respects terminal color capabilities

### 📡 **Event System**

Type-safe event handling using Node.js diagnostics channels.

```typescript
import {
  subscribeToStart,
  subscribeToFinish,
  subscribeToError,
} from "@rnx-kit/reporter";

// Listen for task start events
const unsubscribeStart = subscribeToStart((session) => {
  console.log(`Task started: ${session.name} (depth: ${session.depth})`);
});

// Listen for task completion
const unsubscribeFinish = subscribeToFinish((session) => {
  console.log(`Task finished: ${session.name} in ${session.elapsed}ms`);
  console.log(`Operations:`, session.operations);
});

// Listen for errors
const unsubscribeError = subscribeToError((event) => {
  console.log(`Error in ${event.session.name}:`, event.args);
});

// Cleanup when done
unsubscribeStart();
unsubscribeFinish();
unsubscribeError();
```

### 🌊 **Cascading Reporters**

Share reporter configuration across process trees via environment variables.

```typescript
import { createCascadingReporter } from "@rnx-kit/reporter";

// Parent process
const reporter = createCascadingReporter("MY_APP_REPORTING", {
  level: "verbose",
  file: {
    out: "./logs/app.log",
    err: "./logs/errors.log",
    capture: true, // capture all stdout/stderr
  },
});

// Child processes automatically inherit these settings
// and append to the same log files with PID prefixes
```

**Features:**

- **Environment Inheritance**: Settings passed via environment variables
- **File Output**: Shared log files with process ID prefixes
- **Capture Mode**: Intercept all console output
- **Depth Tracking**: Hierarchical process depth management

### ⚡ **Performance Tracking**

Built-in performance monitoring that can be enabled globally.

```typescript
import { checkOrEnablePerfTracing } from "@rnx-kit/reporter";

// Enable performance tracking
checkOrEnablePerfTracing({
  level: "log",
  file: { out: "./perf.log" },
});

// All reporter tasks and measurements are now tracked
// Automatic performance reports on task completion
```

## Output Destinations

### 📤 **Console Output**

Default output to stdout/stderr with proper log level routing.

```typescript
import { createOutput } from "@rnx-kit/reporter";

// Console output with specific log level
const output = createOutput("warn"); // Only error and warn messages
```

### 📁 **File Output**

Write logs to files with automatic directory creation.

```typescript
import { openFileWrite } from "@rnx-kit/reporter";

const fileOutput = createOutput(
  "verbose",
  openFileWrite("./logs/app.log", true), // append mode
  openFileWrite("./logs/errors.log", true)
);
```

### 🔀 **Multiple Outputs**

Combine multiple output destinations.

```typescript
import { mergeOutput, createOutput } from "@rnx-kit/reporter";

const consoleOut = createOutput("warn");
const fileOut = createOutput("verbose", fileWriter);
const combined = mergeOutput(consoleOut, fileOut);
```

## Architecture Principles

### 🧩 **Modular Design**

Each component can be used independently:

- Use just the logger for simple logging needs
- Add the reporter for task tracking
- Include formatting for rich output
- Enable events for monitoring

### 🎯 **Zero Dependencies**

Completely self-contained with no external dependencies, using only Node.js
built-ins.

### 📏 **Type Safety**

Comprehensive TypeScript definitions with full type inference and safety.

### 🔄 **Side-Effect Free**

ESM modules with no global state pollution - safe for library use.

### ⚡ **Performance Focused**

- Lazy initialization of heavy components
- Efficient string handling
- Minimal allocation in hot paths
- Optional features don't impact performance when unused

## Common Patterns

### 🏗️ **Build Tool Integration**

```typescript
const build = createReporter({ name: "webpack-build", reportTimers: true });

await build.task("compile", async (task) => {
  const stats = await task.measure("typescript", () => compileTypeScript());
  const bundle = await task.measure("webpack", () => runWebpack());
  task.log(`Compilation complete: ${stats.files} files, ${bundle.size} bytes`);
});
```

### 🧪 **Test Runner Integration**

```typescript
const test = createReporter({ name: "test-runner", output: "verbose" });

for (const suite of testSuites) {
  await test.task(suite.name, async (suiteTask) => {
    for (const testCase of suite.tests) {
      try {
        await suiteTask.measure(testCase.name, () => testCase.run());
        suiteTask.log(`✅ ${testCase.name}`);
      } catch (error) {
        suiteTask.error(`❌ ${testCase.name}:`, error);
      }
    }
  });
}
```

### 🚀 **CLI Application Logging**

```typescript
const app = createCascadingReporter("MY_CLI_APP", {
  level: process.env.VERBOSE ? "verbose" : "log",
  file: process.env.LOG_FILE ? { out: process.env.LOG_FILE } : undefined,
});

if (app) {
  await app.task("main", async (task) => {
    task.log("Application started");
    // CLI logic
  });
}
```
