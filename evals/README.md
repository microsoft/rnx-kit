# @rnx-kit/evals

This is for internal use only. To audit agent sessions in your own repository,
see [`@rnx-kit/agent-evals`](../incubator/agent-evals).

Audits coding agent sessions in this repository against its conventions, e.g.
those in [`AGENTS.md`](../AGENTS.md), with
[`@rnx-kit/agent-evals`](../incubator/agent-evals). Each rule is a test in
[`tests/audit.yaml`](tests/audit.yaml); see
[`promptfooconfig.yaml`](promptfooconfig.yaml) for the options.

```sh
yarn eval                               # the current or latest local session
yarn eval --var copilotSession=<id>     # a specific session
yarn eval --var pullRequest=<number>    # a pull request
```

## Reports on pull requests

Run the evals and post the report on a pull request:

```sh
yarn eval:report            # the pull request of the current branch
yarn eval:report <number>   # a specific pull request
```

Arguments after the number are passed to `yarn eval`. The report is posted in a
single comment, which is updated on every run. If the comment cannot be edited,
e.g. if the workflow posted it on a pull request from a fork, a new one is
posted, and that one is updated from then on. The comment starts with a marker
that records the audited commit, and whether the session log was read.

The [`Agent evals`](../.github/workflows/agent-evals.yml) workflow audits pull
requests that Copilot, Claude or Cursor created or co-authored. It runs
`yarn eval:report <number>` with `GITHUB_TOKEN`, which cannot read the session
logs, so it can only audit the changes. If the comment already has a report with
the session log for the latest commit, the workflow skips the audit. Only
reports by the workflow and by the account running `yarn eval:report` (in the
workflow, the author of the pull request) count. The workflow only reports;
failed rules do not fail the check.

## Adding rules

Add a test to [`tests/audit.yaml`](tests/audit.yaml). Use the checks from
`@rnx-kit/agent-evals`, or add your own to [`src`](src) and export it from
[`src/index.ts`](src/index.ts). Set `metadata.requires: session` if the rule
needs more than the changes, e.g. the commands that were run.
