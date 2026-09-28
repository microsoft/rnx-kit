---
"@rnx-kit/tools-workspaces": patch
---

Fixed `WorkspacesInfo.isWorkspace()` returning `true` for packages that the workspace config excludes, e.g. `!packages/t-800`
