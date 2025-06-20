<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/reporter

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/reporter)](https://www.npmjs.com/package/@rnx-kit/reporter)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a common package for logging output to the console and/or logfiles,
timing tasks and operations, and listening for events for task start, finish,
and errors.

It also contains a performance tracker that can be enabled to dump performance
information from execution of tasks. Enabling performance tracing will chain to
child processes as well to handle script tracking.

## Motivation

Standardizing the reporter used in our packages allows for easier high level
perf analysis of how our tools are behaving. By adding the various events it
also gives a common framework for people to add listeners for telemetry if
desired.

## Installation

```sh
yarn add @rnx-kit/reporter --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/reporter
```

## Usage

Reporters have two roles, the base Reporter role, and a Task role. Reporters are
effectively at the root level, whereas Tasks are parented to a reporter or
another Task.

Reporters are created by calling
`createReporter<T>(options: ReporterOptions<T>)` with any options specified.

- The generic parameter sets the type of the `data` property.
- This allows passing additional information through reporters and tasks and
  will be surfaced in events.

The reporter interface is comprised of several parts:

### Logging Functions

These include `error`, `warn`, `log`, and `verbose`. These are structured like
the console logging functions in that they have variable parameters, which will
be serialized into a single message string by using node's `inspect`. This is
the same internal mechanism used by console.log, at least in the node
implementation.

- The `LogLevel` set in either the global settings, or overridden in the
  reporter settings dictates whether anything is output from the functions.
- `"log"` is the default level, which will enable the `error`, `warn`, and `log`
  functions. The `verbose` function will do nothing.
- File logging can be enabled by configuring `OutputOptions` when creating a
  reporter or by calling `updateDefaultOutput`.
- File logging will share the same log level as the console, unless the level is
  set specifically in the file settings.
- A prefix for a type of message can be set in settings. This is prepended to
  all messages of this type. For instance the default error prefix contains
  `"Error:"`
- A label can be set for the reporter, which will prepend all output for all log
  types.

An additional `throwError` function is provided which will log the error and
then throw with that message. It will send an event for the error, and log it
under the reporter/task.

### Timing Functions

The task functions wrap a function call, either async or synchronous, creating a
new sub reporter in the Task role which is passed as a parameter. The task data
type, output, and formatting options are inherited from the parent reporter.
Events will be sent when the task is started and when it completes, with errors
and sub-operation timing recorded within.

```ts
  task<T>(
    name: string | TaskOptions<TData>,
    fn: (reporter: Reporter<TData>) => T
  ): T;
  taskAsync<T>(
    name: string | TaskOptions<TData>,
    fn: (reporter: Reporter<TData>) => Promise<T>
  ): Promise<T>;
```

The `time` and `timeAsync` functions are helpers for high frequency operation
timing. The results of these operations will be aggregated within the given
reporter or task, and will record the total elapsed time and number of calls.
These will be available in the complete event.

```ts
  time<T>(label: string, fn: () => T): T;
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
```

### Formatting Functions

These functions are part of the `ReporterFormatting` interface and provide
helpers which will format or color text using the settings for the given
reporter.
