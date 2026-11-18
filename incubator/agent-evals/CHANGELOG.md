# @rnx-kit/agent-evals

## 0.2.0

### Minor Changes

- f7e9528: Abstracted the repository host to prepare for hosts other than GitHub.
  `notModifiedOnGitHub` was renamed to `notModified`, `AgentRun.github` to
  `AgentRun.host`, and `GitHubItem` and `GitHubMatcher` to `HostItem` and
  `HostMatcher`. Modified items are now references, e.g. `#123`, instead of
  numbers.

### Patch Changes

- bcaaf34: Local sessions no longer audit commits that landed on the base branch during
  the session, e.g. after rebasing onto it. The base branch defaults to the
  default branch of `remote` and can be set with the new `baseBranch` option.
- Updated dependencies [bcaaf34]
  - @rnx-kit/tools-git@0.1.3

## 0.1.1

### Patch Changes

- b81a13e: Audit the branch a local session last switched to, under its current name,
  instead of the branch it started on

## 0.1.0

### Minor Changes

- 4d42fcf: Audit coding agent sessions against repository conventions with promptfoo
