# @rnx-kit/tools-performance

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-performance)](https://www.npmjs.com/package/@rnx-kit/tools-performance)

Lightweight performance tracing and reporting for Node.js tooling. Provides a
simple API for measuring the duration of synchronous and asynchronous operations,
categorizing them by domain with frequency-based filtering, and printing a
summary table on process exit.

## Motivation

Build tools like Metro bundlers, dependency resolvers, and transformers benefit
from visibility into where time is spent. This package provides a low-overhead
way to instrument code, collect timing data across domains, and produce a
human-readable report — without adding heavy dependencies.

The API is split into two roles:

- **Instrumenting** — library and tool authors add trace points to their code.
  Instrumentation is inert until tracking is enabled.
- **Enabling and reporting** — the application entry point turns on tracking and
  controls how results are displayed.

## Installation

```sh
yarn add @rnx-kit/tools-performance --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-performance
```

## Instrumenting Code

Instrumentation adds trace points to functions you want to measure. When
tracking is not enabled, trace calls are zero-cost passthroughs via `nullTrace`.

### Using the module-level API

The simplest approach uses `getTrace`, which returns a trace function scoped to a
domain. If the domain is not enabled, it returns `nullTrace` — a passthrough
that calls the function directly with no recording overhead.

```typescript
import { getTrace } from "@rnx-kit/tools-performance";

const trace = getTrace("metro");

// Trace a sync function
const config = trace("parse", () => parseConfig(configPath));

// Trace an async function
const bundle = await trace("bundle", async () => {
  return await buildBundle(entryPoint);
});

// Pass arguments directly — types are checked against the function signature
const resolved = trace("resolve", resolveModule, specifier, context);
```

### Using a domain directly

For more control, use `getDomain` to access the `PerfDomain` object. This lets
you check frequency levels and conditionally set up extra instrumentation.

```typescript
import { getDomain } from "@rnx-kit/tools-performance";

const domain = getDomain("resolve");

if (domain?.enabled("high")) {
  // set up extra high-frequency instrumentation
}

const trace = domain?.getTrace("high") ?? nullTrace;
trace("lookup", () => resolveModule(specifier));
```

### Frequency levels

Three hierarchical levels control tracing granularity:

- **`"low"`** — Always recorded when tracing is enabled
- **`"medium"`** — Recorded when frequency is `"medium"` or `"high"` (default)
- **`"high"`** — Only recorded when frequency is `"high"`

```typescript
// This trace only records if the domain's frequency is "high"
const trace = getTrace("resolve", "high");
```

### Null implementations

`nullTrace` is a no-op that calls the wrapped function directly. It is useful as
a default when tracing may not be enabled:

```typescript
import { getTrace, nullTrace } from "@rnx-kit/tools-performance";

// getTrace returns nullTrace when the domain is not enabled
const trace = getTrace("metro");

// Or use it explicitly as a fallback
const myTrace = someCondition ? customTrace : nullTrace;
```

### Custom trace functions

Use `createTrace` with a `TraceRecorder` to build trace functions backed by
custom recording logic. The recorder is called twice per event — once before
(returning a handoff value) and once after (receiving it back):

```typescript
import { createTrace } from "@rnx-kit/tools-performance";
import type { TraceRecorder } from "@rnx-kit/tools-performance";

const recorder: TraceRecorder<number> = (tag, handoff?) => {
  if (handoff !== undefined) {
    console.log(`${tag} took ${performance.now() - handoff}ms`);
  }
  return performance.now();
};

const trace = createTrace(recorder);
trace("work", () => doExpensiveWork());
```

## Enabling and Reporting

The application entry point controls which domains are tracked and how results
are reported. Instrumented code is inert until `trackPerformance` is called.

### Quick start

```typescript
import { trackPerformance, reportPerfData } from "@rnx-kit/tools-performance";

// Enable all domains with in-memory timing
trackPerformance({ strategy: "timing" });

// ... run instrumented code ...

// Print the report (also prints automatically on process exit)
reportPerfData();
```

Output:

```
┌──────────────┬───────┬───────┬───────┐
│ operation    │ calls │ total │   avg │
├──────────────┼───────┼───────┼───────┤
│ metro: parse │     1 │    12 │    12 │
│ metro: bundl │     1 │   450 │   450 │
└──────────────┴───────┴───────┴───────┘
```

### Controlling what is tracked

```typescript
// Enable all domains
trackPerformance({ strategy: "timing" });

// Enable specific domains
trackPerformance({ enable: "metro" });
trackPerformance({ enable: ["resolve", "transform"] });

// Calls are additive — all three domains above are now enabled
```

### Checking if tracing is enabled

`isTraceEnabled` checks domain and frequency without creating a domain as a
side effect:

```typescript
import { isTraceEnabled } from "@rnx-kit/tools-performance";

if (isTraceEnabled("metro")) {
  // domain is enabled
}

if (isTraceEnabled("metro", "high")) {
  // domain is enabled at "high" frequency
}
```

### Using PerfTracker directly

For more control over lifecycle, use `PerfTracker` directly instead of the
module-level API. Each tracker manages its own set of domains and registers a
process exit handler automatically.

```typescript
import { PerfTracker } from "@rnx-kit/tools-performance";

const tracker = new PerfTracker({
  enable: "metro",
  strategy: "timing",
  reportColumns: ["name", "calls", "total", "avg"],
  reportSort: ["total"],
  maxNameWidth: 40,
});

const domain = tracker.domain("metro");
const trace = domain.getTrace();
await trace("bundle", buildBundle, entryPoint);

// Stop tracking and print the report
tracker.finish();
```

### Tracing strategies

| Strategy   | Description                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `"timing"` | Records times in memory. Lower overhead, suitable for high-frequency events. Reports to console on process exit by default. |
| `"node"`   | Uses `performance.mark` and `performance.measure`. Higher overhead, but integrates with Node.js performance tooling.        |

### Table formatting

The `formatAsTable` utility can format any 2D data array into a bordered table:

```typescript
import { formatAsTable } from "@rnx-kit/tools-performance";

const table = formatAsTable(
  [
    ["parse", 12, 1],
    ["bundle", 450, 1],
  ],
  {
    columns: [
      { label: "operation", align: "left" },
      { label: "total (ms)", align: "right", digits: 0, localeFmt: true },
      { label: "calls", align: "right" },
    ],
    sort: [1],
  }
);
console.log(table);
```

## API Reference

### Module-Level Functions

| Function                        | Description                                                             |
| ------------------------------- | ----------------------------------------------------------------------- |
| `trackPerformance(config?)`     | Enable tracking. Config controls domains, strategy, and report options. |
| `getTrace(domain, frequency?)`  | Get a trace function for a domain. Returns `nullTrace` if not enabled.  |
| `getDomain(name)`               | Get the `PerfDomain` for a domain, or `undefined` if not enabled.       |
| `isTraceEnabled(domain, freq?)` | Check if tracing is enabled for a domain and optional frequency.        |
| `reportPerfData()`              | Finish tracking and print the performance report.                       |

### PerfTracker

| Member                     | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `new PerfTracker(config?)` | Create a new tracker. Auto-registers a process exit handler.           |
| `enable(domain)`           | Enable tracking for `true` (all), a string, or string array.           |
| `isEnabled(domain, freq?)` | Check if a domain is enabled, optionally at a given frequency.         |
| `domain(name)`             | Get or create a `PerfDomain` for an enabled domain.                    |
| `finish(processExit?)`     | Stop all domains, print the report, and unregister. Only reports once. |
| `updateConfig(config)`     | Merge new configuration values.                                        |

### PerfDomain

| Member                 | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `name`                 | Domain name (readonly).                                                |
| `strategy`             | Tracing strategy: `"timing"` or `"node"` (readonly).                   |
| `frequency`            | Current frequency level (mutable).                                     |
| `start()`              | Begin domain-level timing (called automatically unless `waitOnStart`). |
| `stop(processExit?)`   | End domain-level timing and clean up marks.                            |
| `enabled(frequency?)`  | Check if a frequency level is active for this domain.                  |
| `getTrace(frequency?)` | Get a trace function, or `nullTrace` if frequency is not active.       |

### Trace Primitives

| Function                   | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `createTrace(recorder)`    | Create a trace function backed by a `TraceRecorder`. |
| `nullTrace(tag, fn, args)` | No-op trace — calls `fn(...args)` directly.          |

### PerformanceOptions

| Field           | Type                          | Default                          | Description                                           |
| --------------- | ----------------------------- | -------------------------------- | ----------------------------------------------------- |
| `enable`        | `true \| string \| string[]`  | `true`                           | Domains to enable tracking for.                       |
| `strategy`      | `"timing" \| "node"`          | `"node"`                         | Tracing strategy.                                     |
| `frequency`     | `"low" \| "medium" \| "high"` | `"medium"`                       | Default event frequency level.                        |
| `waitOnStart`   | `boolean`                     | `false`                          | Don't auto-start domain timing on creation.           |
| `reportColumns` | `PerfReportColumn[]`          | `["name","calls","total","avg"]` | Columns to display in the report.                     |
| `reportSort`    | `PerfReportColumn[]`          | insertion order                  | Columns to sort by, in precedence order.              |
| `showIndex`     | `boolean`                     | `false`                          | Show row index in the report.                         |
| `maxNameWidth`  | `number`                      | `50`                             | Max width for operation names (truncated with `...`). |
| `reportHandler` | `(report: string) => void`    | `console.log`                    | Function that receives the formatted report.          |

### TableOptions

| Field       | Type                          | Default | Description                                     |
| ----------- | ----------------------------- | ------- | ----------------------------------------------- |
| `columns`   | `(string \| ColumnOptions)[]` | auto    | Column labels or configuration objects.         |
| `sort`      | `number[]`                    | none    | Column indices to sort by, in precedence order. |
| `showIndex` | `boolean`                     | `false` | Show a row index column.                        |
| `noColors`  | `boolean`                     | `false` | Strip ANSI styling from output.                 |

### ColumnOptions

| Field       | Type                        | Default  | Description                                  |
| ----------- | --------------------------- | -------- | -------------------------------------------- |
| `label`     | `string`                    | auto     | Column header label.                         |
| `digits`    | `number`                    | --       | Fixed decimal places for numeric values.     |
| `localeFmt` | `boolean`                   | `false`  | Use locale number formatting.                |
| `align`     | `"left"\|"right"\|"center"` | `"left"` | Cell text alignment.                         |
| `maxWidth`  | `number`                    | --       | Maximum column width (truncates with `...`). |
| `style`     | `StyleValue \| function`    | --       | ANSI style or custom formatter.              |
