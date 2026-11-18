---
"@rnx-kit/tools-git": minor
---

`getDefaultBranch()` and `getBaseCommit()` now take options for the repository
directory (`cwd`) and remote (`remote`), and `getBaseCommit()` also takes the
commit to look up (`head`). `getDefaultBranch()` now returns the branch that
`<remote>/HEAD` points to, if it exists, even on CI. On CI, the fallback now
defaults to `<remote>/main`. Elsewhere, if `<remote>/HEAD` doesn't exist, it
asks the remote for its default branch instead of throwing.
