---
"@rnx-kit/build": patch
---

Use bsdtar to extract ZIP files. Note that if we're inside Git Bash shell on Windows, we should use UnZip instead as GNU Tar does not support ZIP.
