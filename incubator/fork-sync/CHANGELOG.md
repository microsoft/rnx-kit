# @rnx-kit/fork-sync

## 0.5.0

### Minor Changes

- de39f3a: Add support for vendoring a subset of very large upstream repos:

  - `sparsePaths` — vendor multiple upstream directories via sparse-checkout (identity-mapped, so each keeps its repo-relative path under the local path). Mutually exclusive with `subDir`. When set, the clone uses `--no-checkout` so the whole default branch isn't materialized before sparse-checkout narrows it.
  - `cloneFilter` — partial-clone filter (default `blob:none`); set `tree:0` to also defer trees, which with `sparsePaths` shrinks the initial clone of a huge repo by orders of magnitude.
  - First-time syncs from an empty `commit` are now supported as a direct import (no base, no merge).

## 0.4.2

### Patch Changes

- f41748c: Handle empty changes and autoupdate tags in sync config

## 0.4.1

### Patch Changes

- b326fad: Improve arg escaping

## 0.4.0

### Minor Changes

- 2f154be: add automatic PR notes generation

## 0.3.0

### Minor Changes

- 1807de7: Support syncing subDir from a target repo

## 0.2.0

### Minor Changes

- 776a1cf: Initial release of fork-sync
