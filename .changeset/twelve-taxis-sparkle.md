---
"@rnx-kit/metro-plugin-typescript": minor
---

Add a new TypeScript module resolver for React Native projects which uses the `moduleSuffixes` compiler option. All resolution is delegated to TypeScript, rather than run through our custom resolvers, since TypeScript's resolvers are more feature-rich and in sync with the node ecosystem.
