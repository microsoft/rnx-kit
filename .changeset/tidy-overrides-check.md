---
"@rnx-kit/align-deps": minor
---

Added an opt-in `--check-overrides` flag that warns when a `resolutions` (Yarn)
or `overrides` (npm) entry pins a managed dependency to a version outside the
active profile. The check is read-only and non-fatal: it only emits warnings,
never modifies overrides (even with `--write`), and does not affect the exit
code.
