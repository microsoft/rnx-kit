---
"@rnx-kit/agent-evals": minor
---

Local sessions no longer audit commits that landed on the base branch during
the session, e.g. after rebasing onto it. The base branch defaults to the
default branch of `remote` and can be set with the new `baseBranch` option.
