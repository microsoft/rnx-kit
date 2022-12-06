---
"@rnx-kit/typescript-react-native-resolver": patch
---

Explicitly fail when our custom resolver encounters TS path-remapping. It can't handle this, and will do the wrong thing. Also, export an existing function as part of the public interface.
