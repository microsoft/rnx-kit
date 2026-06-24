---
"@rnx-kit/fork-sync": minor
---

Add support for vendoring a subset of very large upstream repos:
- `sparsePaths` — vendor multiple upstream directories via sparse-checkout (identity-mapped, so each keeps its repo-relative path under the local path). Mutually exclusive with `subDir`. When set, the clone uses `--no-checkout` so the whole default branch isn't materialized before sparse-checkout narrows it.
- `cloneFilter` — partial-clone filter (default `blob:none`); set `tree:0` to also defer trees, which with `sparsePaths` shrinks the initial clone of a huge repo by orders of magnitude.
- First-time syncs from an empty `commit` are now supported as a direct import (no base, no merge).
