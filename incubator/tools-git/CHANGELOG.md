# @rnx-kit/tools-git

## 0.1.3

### Patch Changes

- bcaaf34: `getDefaultBranch()` and `getBaseCommit()` now take options for the repository
  directory (`cwd`) and remote (`remote`), and `getBaseCommit()` also takes the
  commit to look up (`head`). `getDefaultBranch()` now returns the branch that
  `<remote>/HEAD` points to, if it exists, even on CI. On CI, the fallback now
  defaults to `<remote>/main`. Elsewhere, if `<remote>/HEAD` doesn't exist, it
  asks the remote for its default branch instead of throwing.

## 0.1.2

### Patch Changes

- 6992196: Fixed cannot find base commit from a fork

## 0.1.1

### Patch Changes

- def052e: Fixed exports keys not being prefixed with `.`

## 0.1.0

### Minor Changes

- cb951e6: A collection of functions for common Git operations
