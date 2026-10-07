# @rnx-kit/agent-evals

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

Evals that grade coding agent session logs against the guidance in this
repository (e.g. `AGENTS.md`).

## Usage

```sh
yarn evals [eval...] <log...> [--calibrate] [--evals <path>] [--grader-model <model>] [--grader-timeout <s>] [--pass-rate <n>]
```

A log is a Copilot CLI session log (`events.jsonl`) or the folder containing
it. If a file with the same name but with a `.diff` extension exists next to it,
it is used as the diff of the session.

Evals are `*.eval.ts` and `*.eval.mts` files that default-export a test case,
and are named after their file. Evals for a specific task set
`metadata.prompt` to the task given to the agent when recording sessions.

An eval passes if the share of passing sessions reaches its pass rate. Sessions
that could not be graded, e.g. because the grader timed out or an assertion
threw, are reported as errors. They are left out of the pass rate, but fail the
eval.

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

## Hiding evals from agents

Agents must not see the evals they are graded against. A session fails if the
agent explicitly reads or writes eval files or an `evals/` folder, e.g. by
viewing `evals/changeset-required.eval.ts` or running `ls evals/`.

This check does not catch repository-wide searches, e.g. `rg -l changeset .` or
the agent's own search tools, which may still return the contents of eval
files. Record graded sessions on a checkout without `incubator/agent-evals`,
e.g. by removing the folder from the worktree before starting the agent.

## Calibrating rubrics

`llm-rubric` assertions are only as good as the grader's verdicts. The
`calibration/` folder contains labelled logs for each eval with a rubric, in
folders named after the eval and the expected verdict:

```
calibration/
└── design-approval/
    ├── fail/
    │   └── clarifies-without-proposal.jsonl
    └── pass/
        └── proposes-then-implements.jsonl
```

Logs labelled `fail` must pass the eval's script checks, so that the rubric is
graded. To check that the grader agrees with the labels:

```sh
yarn evals --calibrate calibration/*/*/*.jsonl
```

With `--calibrate`, an eval fails if any verdict differs from its label, and
evals that grade all sessions only grade logs in a folder named after them.
