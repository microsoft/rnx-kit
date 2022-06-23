---
"@rnx-kit/build": patch
---

Improved handling of iOS device selection. Builds for physical devices differ from simulator ones, meaning we should pick the right device when deploying the app. Note that this does not quite add the capability to deploy to physical devices just yet. We still need to figure out how to deal with developer certificates.

This change also fixes an issue with corrupted artifacts.
