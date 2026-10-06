# @rnx-kit/agent-evals

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Evals that grade coding agent session logs against the guidance in this
repository (e.g. `AGENTS.md`).

## Usage

```sh
yarn evals [eval...] <log...> [--evals <path>] [--grader-model <model>] [--pass-rate <n>]
```

A log is a Copilot CLI session log (`events.jsonl`) or the folder containing
it. If a file with the same name but with a `.diff` extension exists next to it,
it is used as the diff of the session.

Evals are `*.eval.ts` and `*.eval.mts` files that default-export a test case,
and are named after their file.

## Matching evals to sessions

Most evals only make sense for a specific task. An eval only grades logs with a
folder named after the eval in their path, e.g.:

```
logs/
├── changeset-required/
│   ├── session-1.jsonl
│   └── session-1.diff
└── design-approval/
    └── <session-id>/
        └── events.jsonl
```

If a log is inside the current folder, only folders below the current folder
are considered. Otherwise, only folders in the log path as specified are
considered.

Evals that apply to any session set `metadata.allSessions` to `true`. Other logs
are reported as skipped, and an eval without any matching logs is skipped.
