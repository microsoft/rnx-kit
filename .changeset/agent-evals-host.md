---
"@rnx-kit/agent-evals": minor
---

Abstracted the repository host to prepare for hosts other than GitHub.
`notModifiedOnGitHub` was renamed to `notModified`, `AgentRun.github` to
`AgentRun.host`, and `GitHubItem` and `GitHubMatcher` to `HostItem` and
`HostMatcher`. Modified items are now references, e.g. `#123`, instead of
numbers.
