<!--remove-block start-->

# @rnx-kit/golang

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/golang)](https://www.npmjs.com/package/@rnx-kit/golang)

<!--remove-block end-->

Integrate [Go](https://golang.org) into your monorepo and create native apps
that accelerate development and CI builds.

## Motivation

JavaScript monorepos make extensive use of NodeJs-based tools like TypeScript,
Babel, Metro and Webpack, to name just a few. As monorepos grow in size and
complexity, developers are finding that the tools don't scale well. Native
applications like esbuild and swc are emerging to address poor toolchain
performance, and more are expected to appear in the coming years.

Developers need to optimize the tools they use to keep engineering productivity
high. Turning the crank on a PR should take minutes, not hours. Converting
pieces of the toolchain to native code is required to achieve this goal.

## Usage

There are three core functions in this library. To build and use Go programs,
you'll need to integrate them into your task runner and CI loops.

```typescript
type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

// Task factories for installing Go, and building/running Go programs.
function goInstallTask(logger?: Logger): () => Promise<void>;
function goBuildTask(logger?: Logger): () => Promise<void>;
function goTask(
  logger: Logger | undefined,
  name: string,
  ...args: string[]
): () => Promise<void>;
```

Go installation first looks for an existing version of Go in the system path. If
nothing was found, a local distribution of Go is downloaded and cached in the
monorepo. Future "install" calls will detect the local installation, skipping
this entire step.

The Go build task looks for Go apps under ./go/`{project-name}` and stores built
binaries under ./bin. Each app is built using the command "go build -o
`{bin-path}`". The Go app's binary name doesn't need to match `{project-name}`.

The Go execution task looks for the named binary in ./bin and executes it with
an optional set of arguments.

### Pre-requisites

Windows 10 in a minimum requirement. This package uses `tar` which ships with
that version of Windows.

### Build Tasks

The three functions are task factories. They each return a function that you can
run as a build step in systems like [Just](https://microsoft.github.io/just) or
[Gulp](https://gulpjs.com).

```typescript
import { task, logger } from "just-scripts";
import { goBuildTask, goTask } from "@rnx-kit/golang";

// Make new Just tasks to install Go and build Go programs
task("go:install", goInstallTask(logger));
task("go:build", goBuildTask(logger));
task("go", series("go:install", "go:build"));

// Tie them into the mainline build task
task("build", build("clean", "go", "lint", "ts"));

// Add a Just task wrapper to execute the Go app named "transcode-media"
// which reformats video files into 640x480 @ 30 fps using a well-known
// encoding like AVC/H.264.
//
// This can be executed as part of other tasks, or directly on the
// command-line: npm run just-scripts transcode-media.
//
task(
  "transcode-media",
  goTask(logger, "transcoder", assetsDir, transcoderOutputDir)
);
```

### CI Loop Tasks

Some CI systems like [GitHub Actions](https://github.com/features/actions) have
VM images that come with Go preinstalled. To use the installed copy in GitHub
Actions, you may need to add a step like
[setup-go](https://github.com/actions/setup-go) to your CI pipeline definition:

```yaml
- uses: actions/setup-go@v2
  with:
    go-version: "^1.14.0"
```

If you're using a different CI provider, find out if Go is on the build VMs. It
will save you time and bandwidth on each CI run.

### .gitignore

Avoid checking in Go apps, as they are platform-specific and take up a lot of
room. Add an entry to `.gitignore` to exclude the bin directory from each
package:

```diff
+/packages/*/bin/
 /packages/*/dist/
 /packages/*/lib/
 node_modules/
```

### `clean` build task

It's a good idea to clean out each package's `bin` directory when running a
`clean` build task. This removes any stale Go apps, which will be rebuilt as
needed.

```diff
import { cleanTask } from "just-scripts";

export const clean = cleanTask({
  paths: [
+   "bin",
    "lib",
  ].map((p) => path.join(process.cwd(), p)),
});
```
