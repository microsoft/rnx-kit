# @rnx-kit/agent-evals

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/agent-evals)](https://www.npmjs.com/package/@rnx-kit/agent-evals)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

`@rnx-kit/agent-evals` audits a coding agent session against a repository's
conventions with [promptfoo](https://promptfoo.dev). It provides a promptfoo
provider that replays a Copilot session, a Copilot grader for `llm-rubric`
assertions, and checks that assertions can reference.

See [`evals`](https://github.com/microsoft/rnx-kit/tree/main/evals) for how it
is used in this repository.

## Installation

```sh
yarn add @rnx-kit/agent-evals --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/agent-evals
```

The [grader](#grader) also requires `@github/copilot-sdk`:

```sh
yarn add @github/copilot-sdk --dev
```

## Usage

promptfoo loads providers and assertions from files, so re-export them from
your eval project, e.g. in `src/provider.ts`, `src/grader.ts` and `src/index.ts`:

```ts
// src/provider.ts
export { default } from "@rnx-kit/agent-evals/provider";
```

```ts
// src/grader.ts
export { default } from "@rnx-kit/agent-evals/grader";
```

```ts
// src/index.ts
export { afterAll } from "@rnx-kit/agent-evals/report";
export { didNotRunCommand, forGrader } from "@rnx-kit/agent-evals";
```

Then reference them in `promptfooconfig.yaml`:

```yaml
prompts:
  - "{{copilotSession}}"
providers:
  - id: file://src/provider.ts
defaultTest:
  vars:
    copilotSession: ""
    pullRequest: ""
  options:
    provider:
      id: file://src/grader.ts
      config: { model: claude-sonnet-5.5 }
tests: file://tests/*.yaml
extensions:
  - file://src/index.ts:afterAll
```

Finally, run the evals with promptfoo:

```sh
npx promptfoo eval
```

To audit a specific session or pull request, set the corresponding
[var](#provider):

```sh
npx promptfoo eval --var copilotSession=<session id>
npx promptfoo eval --var pullRequest=<number>
```

## Provider

`@rnx-kit/agent-evals/provider` replays a Copilot session and returns an
[`AgentRun`](src/types.ts) with the commands it ran, its tool calls, the files
it changed, and its requests and replies. What it audits depends on the vars:

- `copilotSession`: ID of a local Copilot session, read from `$COPILOT_HOME`
  (default: `~/.copilot`). If empty, the session running the evals, or if there
  is none, the most recently updated session in the repository that is not in
  use; `previous` always picks the latter. The changes are those on the
  session's branch since it started. The session's branch is the one it last
  switched to, according to the reflog of `HEAD`, or else the one it started
  on, under the name it was last renamed to.
- `pullRequest`: number of a pull request. Its Copilot cloud agent sessions are
  read from GitHub, and the changes are those since it branched off its base
  branch. If the sessions cannot be read, e.g. if the pull request was made in
  a local session, or the token cannot read them, only the changes are audited.
  Tests with `metadata.requires: session` are then skipped.

The provider accepts the following `config`:

| Option          | Description                                                                        |
| :-------------- | :--------------------------------------------------------------------------------- |
| `remote`        | Remote to look up branches and the repository on; defaults to `origin`             |
| `repository`    | GitHub repository, as `owner/repo`; defaults to the repository of `remote`         |
| `copilotApiUrl` | Copilot API to read cloud agent sessions from; defaults to `api.githubcopilot.com` |

Reading cloud agent sessions requires a user token with Copilot access, e.g.
from `gh auth login`. The `GITHUB_TOKEN` of a workflow cannot read them.

## Grader

`@rnx-kit/agent-evals/grader` grades `llm-rubric` assertions with Copilot. It
requires a GitHub token with Copilot access in `COPILOT_GITHUB_TOKEN`,
`GH_TOKEN` or `GITHUB_TOKEN`, or a `gh auth login` session. Set `config.model`
to pick a model; without it, Copilot picks its default, which may not be
available to every account. Use `forGrader` as a transform to format the run for
the rubric:

```yaml
- description: "Explains why the change is needed"
  assert:
    - type: llm-rubric
      transform: file://src/index.ts:forGrader
      value: "The final message explains why the change is needed"
```

## Report

`afterAll` from `@rnx-kit/agent-evals/report` prints each test with the reasons
it failed. Each test is `passed`, `failed`, `unchecked` if it could not be
graded, or `skipped` if it needs the session log. `statusOf` and
`formatMarkdown` return the same for other reports, e.g. pull request comments.

## Checks

Checks are `javascript` assertions, configured with `config`:

```yaml
- description: "Builds through yarn instead of calling tsc directly"
  metadata: { requires: session }
  assert:
    - type: javascript
      value: file://src/index.ts:didNotRunCommand
      config: { pattern: '^(npx )?tsc\b' }
```

| Check                 | Passes if                                                                                                            |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `changesets`          | The agent added `count` change files (at least `count` with `atLeast`), releasing `packages` and none of `forbidden` |
| `didNotRunCommand`    | No command matches `pattern` (and `cwd`)                                                                             |
| `matchesContent`      | No changed file matching `files` contains any of `forbidden`; set `addedLinesOnly` to only check added lines         |
| `notModifiedOnGitHub` | No issue or pull request with a title matching `title` was modified, nor, with `ownOnly`, any by others              |
| `ranChecksForChanges` | Each changed package ran each of `scripts` (default: `format`, `lint` and `test`) that it defines                    |
| `ranCommand`          | A command matches `pattern` (and `cwd`)                                                                              |

To write your own, see the helpers and types exported from
[`src/index.ts`](src/index.ts).
