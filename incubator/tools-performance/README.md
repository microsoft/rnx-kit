<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/tools-performance

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-performance)](https://www.npmjs.com/package/@rnx-kit/tools-performance)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Lightweight performance tracing and reporting for Node.js tooling. Provides a
simple API for measuring the duration of synchronous and asynchronous operations,
categorizing them by area, and printing a summary table on process exit.

## Motivation

Build tools like Metro bundlers, dependency resolvers, and transformers benefit
from visibility into where time is spent. This package provides a low-overhead
way to instrument code, collect timing data across categories, and produce a
human-readable report — without adding heavy dependencies.

## Installation

```sh
yarn add @rnx-kit/tools-performance --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-performance
```

## Quick Start

The simplest way to get started is with the module-level API:

```typescript
import {
  trackPerformance,
  getTrace,
  reportPerfData,
} from "@rnx-kit/tools-performance";

// Enable tracking (optionally scoped to a category)
trackPerformance(true);

const trace = getTrace();

// Trace a sync function
const result = trace("parse", () => parseConfig(configPath));

// Trace an async function
const bundle = await trace("bundle", async () => {
  return await buildBundle(entryPoint);
});

// Print the report (also prints automatically on process exit)
reportPerfData();
```

Output:

```
Performance results:
┌────────┬───────┬───────┬─────┐
│ name   │ calls │ total │ avg │
├────────┼───────┼───────┼─────┤
│ parse  │     1 │    12 │  12 │
│ bundle │     1 │   450 │ 450 │
└────────┴───────┴───────┴─────┘
```

## Usage

### Module-Level API

For typical usage, the module-level functions manage a shared `PerfManager`
instance automatically:

```typescript
import {
  trackPerformance,
  getTrace,
  getRecorder,
  isTrackingEnabled,
  reportPerfData,
} from "@rnx-kit/tools-performance";

// Enable all tracking
trackPerformance(true);

// Or enable specific categories
trackPerformance("metro");
trackPerformance(["resolve", "transform"]);

// Get a trace function (returns nullTrace passthrough if not enabled)
const trace = getTrace("metro");
const result = trace("operation", myFunction, arg1, arg2);

// Get a low-level recorder for manual timing
const record = getRecorder("metro");
record("custom-op"); // mark start
// ... do work ...
record("custom-op", elapsed); // mark completion with duration in ms

// Check if tracking is enabled
if (isTrackingEnabled("metro")) {
  // ...
}

// Print report early (also auto-reports on process exit)
reportPerfData();

// Peek at results without finalizing (continues tracking, still reports at exit)
reportPerfData(true);
```

### PerfManager Class

For more control, use `PerfManager` directly:

```typescript
import { PerfManager } from "@rnx-kit/tools-performance";

const mgr = new PerfManager({
  sort: "total",
  cols: ["name", "calls", "total", "avg"],
  maxOperationWidth: 40,
});

mgr.enable("metro");

const trace = mgr.getTrace("metro");
await trace("bundle", buildBundle, entryPoint);

// Get raw results (no ANSI styling) for programmatic use
const results = mgr.getResults();

// Print formatted report
mgr.report();
```

### Trace Function

The `trace` function wraps any function and measures its execution time. It
handles both sync and async functions transparently:

```typescript
// With a closure (most common)
const result = trace("myOp", () => doWork(a, b));

// Without a closure — args are type-checked against the function signature
const result = trace("myOp", doWork, a, b);

// Async functions are detected automatically
const result = await trace("fetch", () => fetch(url));
```

If the traced function throws (sync) or rejects (async), the error propagates
normally. The start is recorded but no completion is logged, which shows up as an
error count in the report.

### Creating Custom Trace Functions

Use `createTrace` to build a trace function backed by a custom recorder:

```typescript
import { createTrace } from "@rnx-kit/tools-performance";
import type { TraceRecorder } from "@rnx-kit/tools-performance";

const myRecorder: TraceRecorder = (tag, durationMs) => {
  if (durationMs !== undefined) {
    console.log(`${tag} took ${durationMs}ms`);
  }
};

const trace = createTrace(myRecorder);
trace("work", () => doExpensiveWork());
```

### Null Implementations

`nullTrace` and `nullRecord` are no-op implementations useful as defaults when
tracking is disabled:

```typescript
import { nullTrace, nullRecord } from "@rnx-kit/tools-performance";

// nullTrace passes through to the function with no overhead beyond arg forwarding
const result = nullTrace("tag", myFunction, arg1, arg2);

// nullRecord does nothing
nullRecord("tag", 42);
```

## API Reference

### Module-Level Functions

| Function                           | Description                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `trackPerformance(mode?, config?)` | Enable tracking. `mode`: `true`, a category string, or array of categories.  |
| `getTrace(category?)`              | Get a trace function for a category. Returns `nullTrace` if not enabled.     |
| `getRecorder(category?)`           | Get a recorder function for a category. Returns `nullRecord` if not enabled. |
| `isTrackingEnabled(category?)`     | Check if tracking is enabled for a category.                                 |
| `reportPerfData(peekOnly?)`        | Print the performance report. Pass `true` to peek without finalizing.        |

### PerfManager

| Member                     | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| `new PerfManager(config?)` | Create a new manager. Auto-registers a process exit handler.    |
| `enable(category)`         | Enable tracking for `true` (all), a string, or string array.    |
| `isEnabled(category?)`     | Check if a category is enabled.                                 |
| `getTrace(category?)`      | Get a trace function for the category.                          |
| `getRecorder(category?)`   | Get a recorder function for the category.                       |
| `getResults()`             | Get raw `PerfDataEntry[]` (no ANSI codes) for programmatic use. |
| `report(peekOnly?)`        | Print the formatted report to the console.                      |
| `updateConfig(config)`     | Merge new configuration values.                                 |

### Trace Primitives

| Function                       | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `createTrace(recorder)`        | Create a trace function backed by a custom `TraceRecorder`. |
| `nullTrace(tag, fn, ...args)`  | No-op trace — calls `fn(...args)` directly.                 |
| `nullRecord(tag, durationMs?)` | No-op recorder.                                             |

### PerformanceConfiguration

| Field               | Type                                 | Default                                   | Description                                                   |
| ------------------- | ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------- |
| `sort`              | `PerfDataColumn \| PerfDataColumn[]` | insertion order                           | Columns to sort by, in precedence order.                      |
| `cols`              | `PerfDataColumn[]`                   | `["name","calls","total","avg","errors"]` | Columns to display. Errors auto-hidden when all are 0.        |
| `maxOperationWidth` | `number`                             | `50`                                      | Max visible width for operation names (truncated with `...`). |

### PerfDataEntry

| Field       | Type     | Description                                            |
| ----------- | -------- | ------------------------------------------------------ |
| `name`      | `string` | Composed label: `"area: operation"` or `"operation"`.  |
| `area`      | `string` | Category name (empty string if unscoped).              |
| `operation` | `string` | Operation name.                                        |
| `calls`     | `number` | Number of times the operation was started.             |
| `total`     | `number` | Total duration in milliseconds (completed calls only). |
| `avg`       | `number` | Average duration per completed call.                   |
| `errors`    | `number` | Calls started but never completed (threw or rejected). |
