---
"@rnx-kit/tools-git": minor
---

`getDefaultBranch()` and `getBaseCommit()` now take a repository directory, a remote, and (for `getBaseCommit()`) the commit to look up. `getDefaultBranch()` asks the remote for its default branch when `<remote>/HEAD` doesn't exist, instead of throwing
