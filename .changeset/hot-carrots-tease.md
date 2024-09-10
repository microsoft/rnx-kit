---
"@rnx-kit/cli": minor
---

Moved Commander config from `@rnx-kit/cli` to `@rnx-kit/third-party-notices` and
resynced all flags. Unfortunately, this means that if you were using the
`rnx-write-third-party-notices` command before, you might have to adjust your
flags when upgrading to this version.
