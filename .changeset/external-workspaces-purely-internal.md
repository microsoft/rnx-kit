---
"@rnx-kit/yarn-plugin-external-workspaces": patch
---

Fix two issues that prevented the plugin from working with purely-internal externals (workspaces that exist locally but were never published to npm):

1. `getFinderFromJsonConfig` was reading `generated.generated.{...}` from the config JSON, but the README and `WorkspaceOutputJson` type both document the shape as `generated.{...}`. The double-nested access caused `repoPath` and `workspaces` to always be empty, so `findPackage` always returned `null` and externals fell through to npm. Drop the extra `?.generated`.

2. The resolver chain `external: → fallback: → npm:` hard-fails at the npm step for packages that don't exist on the npm registry. The plugin's design assumes externals always have *some* version on npm for semver coalescing, but in monorepos where externals are purely-internal that's not true. Add a purely-local fast path: when the local resolver is called and `isLocal=true`, skip the chain and return a direct `external:` locator — the fetcher already resolves it via `workspace.localPath`. `getResolutionDependencies` returns `{}` in the same case so yarn doesn't try to pre-resolve a fallback chain that won't exist.
