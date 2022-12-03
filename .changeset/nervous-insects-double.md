---
"@rnx-kit/typescript-react-native-compiler": patch
---

rn-tsc will now automatically prepend the 'platform' command-line parameter to the list of React Native file extensions is uses when resolving modules to files (e.g. the 'platformExtensions' command-line parameter). It wasn't doing this before, and was instead benefiting from that behavior being built into typescript-react-native-resolver.
