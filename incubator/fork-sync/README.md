# @rnx-kit/fork-sync

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/fork-sync)](https://www.npmjs.com/package/@rnx-kit/fork-sync)

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

Sync forked/vendored dependencies with upstream using Git's native 3-way merge.
Preserves local modifications while incorporating upstream changes.

## Two CLI Tools

- **`fork-sync`** — Main sync tool. Clones upstream, creates a work branch with
  your local changes, merges the target upstream commit, and copies the result
  back.
- **`ai-merge`** — AI-assisted Git mergetool. Parses conflict markers into
  hunks, sends each to an AI (Claude or Copilot) for resolution, validates
  confidence, and applies or skips.

## Installation

```sh
npm install -g @rnx-kit/fork-sync
```

## Usage

### fork-sync

```sh
# Sync to latest upstream commit on the tracked branch
fork-sync --dep <name>

# Sync to a specific commit or tag
fork-sync --dep <name> --commit <sha>
fork-sync --dep <name> --tag v24.2.0

# Switch to a new upstream branch
fork-sync --dep <name> --branch v25.x

# Show sync status
fork-sync --dep <name> --status

# Continue after manual conflict resolution
fork-sync --dep <name> --continue

# Abort an in-progress sync
fork-sync --dep <name> --abort

# Run AI merge on all conflicted files (default)
fork-sync --dep <name> --mergetool ai

# Use git's built-in mergetool instead
fork-sync --dep <name> --mergetool git

# Clean cached upstream clone
fork-sync --dep <name> --clean --no-sync
```

### ai-merge

Designed to integrate with Git's `mergetool` system:

```sh
ai-merge --base $BASE --local $LOCAL --remote $REMOTE --merged $MERGED
```

## Configuration

### sync-manifest.json

The manifest file defines which dependencies to sync and how AI merge should
behave. Place it in the repository root (or specify with `--manifest`).
`fork-sync` searches from the current directory upward until it finds the file
or hits a `.git` boundary.

```json
{
  "version": 1,
  "aiMerge": {
    "provider": "copilot",
    "model": ["gpt-6-luna", "auto"],
    "reasoningEffort": "low",
    "minConfidence": "MEDIUM"
  },
  "dependencies": [
    {
      "name": "hermes",
      "localPath": "."
    },
    {
      "name": "icu-small",
      "localPath": "external/icu-small"
    }
  ]
}
```

| Field                      | Description                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `version`                  | Must be `1`                                                                                            |
| `aiMerge.provider`         | AI CLI: `"copilot"` (default, GitHub Copilot CLI) or `"claude"` (Claude Code)                          |
| `aiMerge.model`            | Model ID, or an ordered list of model IDs to fall back through (optional; see below)                   |
| `aiMerge.reasoningEffort`  | Copilot reasoning effort: `none`…`max`, or `"default"` for the model's own (optional; default `"low"`) |
| `aiMerge.minConfidence`    | Minimum confidence to apply a hunk: `"HIGH"`, `"MEDIUM"` (default), or `"LOW"`                         |
| `dependencies[].name`      | Unique name for the dependency (used in `--dep` flag)                                                  |
| `dependencies[].localPath` | Path to the vendored copy, relative to the manifest. Use `"."` for full-repo forks                     |

#### Choosing AI models

Model IDs change as providers release and retire models, so fork-sync does not
hard-code any. Without `aiMerge.model`, the Copilot provider uses **`auto`**:
Copilot routes each request to a suitable model (the VS Code model picker calls
this "Fusion"), which never goes stale. To pin specific models, list them in
order of preference; when the CLI reports a model as not available, ai-merge
warns and moves to the next entry, and after the last entry it uses the CLI's
default model. Ending the list with `"auto"` keeps merges working when a pinned
model is retired. Model IDs are the ones the CLI accepts with `--model`
(e.g. `gpt-6-luna`, `claude-haiku-5.5`); for Claude Code, aliases such as
`"haiku"` always mean the latest model of that family.

Each conflict hunk costs two short AI calls (resolve, then validate), so small,
low-cost models work well. `reasoningEffort` (Copilot only, default `"low"`)
keeps them fast and cheap; it is skipped automatically for models that do not
support it, such as `auto`.

### sync-config.json

Each dependency needs a `sync-config.json` in its local directory (e.g.,
`external/icu-small/sync-config.json`). This file tells `fork-sync` where to
fetch upstream code from and tracks the last synced commit. It is auto-updated
after each successful sync.

```json
{
  "repo": "https://github.com/nodejs/node",
  "branch": "main",
  "commit": "abc1234def5678...",
  "subDir": "deps/icu-small",
  "tag": "",
  "lastSync": "2025-06-15T10:30:00.000Z"
}
```

| Field                | Description                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `repo`               | Full URL of the upstream repository                                                        |
| `branch`             | Upstream branch to track                                                                   |
| `commit`             | Last synced upstream commit hash (empty/absent for the first sync)                         |
| `subDir`             | Single subfolder within the upstream repo to sync, prefix-stripped (optional)              |
| `sparsePaths`        | Multiple upstream directories or files to vendor, identity-mapped (optional; see below)    |
| `cloneFilter`        | Partial-clone filter, `git --filter=<value>` (optional; default `blob:none`; history mode) |
| `fetchMode`          | `"history"` (default) or `"snapshot"` (optional; see below)                                |
| `submodules`         | Git submodules to sync at the SHAs upstream pins (optional; snapshot mode; see below)      |
| `keepLocalDeletions` | Keep files removed from the vendored copy removed on every sync (optional; snapshot mode)  |
| `tag`                | Tag name if synced to a tag (empty string otherwise)                                       |
| `lastSync`           | ISO timestamp of last sync (empty string if never synced)                                  |

> `subDir` and `sparsePaths` are mutually exclusive. Omit both to sync the whole repo.

#### First sync (initial import)

To vendor a dependency for the first time, create its `sync-config.json` with an
**empty (or absent) `commit`** and run `fork-sync --dep <name>` (optionally with
`--tag`/`--commit`/`--branch`). fork-sync imports the upstream content directly —
there is no base to merge against — and writes the resolved commit/tag back into
`sync-config.json`. Subsequent syncs use the normal 3-way merge.

#### Subfolder sync with `subDir`

When a dependency lives inside a larger upstream repository, set `subDir` to
sync only that subfolder. For example, to vendor `deps/icu-small/` from the
Node.js repository into `external/icu-small/`:

```json
{
  "repo": "https://github.com/nodejs/node",
  "branch": "main",
  "commit": "1bd7f62d139...",
  "subDir": "deps/icu-small"
}
```

When `subDir` is set:

- **Sparse checkout** is configured automatically so only the subfolder is
  materialized on disk, avoiding the cost of checking out the entire upstream
  repo.
- **Path mapping** strips the `subDir` prefix from upstream paths and the
  `localPath` prefix from local paths, producing a common relative path for file
  comparison and copying.
- **Git merge** operates on the full commit graph and works correctly — only the
  subfolder has local modifications, so conflicts only arise there.

When `subDir` is omitted or empty, the entire upstream repo is synced (default
behavior).

#### Multiple directories with `sparsePaths`

When you need to vendor **several top-level directories** from a large upstream
repo (and `subDir`'s single prefix-stripped folder doesn't fit), set
`sparsePaths` to a list of directories. For example, to vendor Chromium's `base`,
`sandbox`, `build`, and `buildtools` into `deps/chromium/`:

```json
{
  "repo": "https://chromium.googlesource.com/chromium/src",
  "branch": "main",
  "commit": "",
  "tag": "149.0.7827.149",
  "sparsePaths": ["base", "sandbox", "build", "buildtools"]
}
```

When `sparsePaths` is set:

- **Sparse checkout** materializes only the listed directories on disk, so the
  rest of a huge upstream tree is never checked out.
- **Identity path mapping** — unlike `subDir`, each path keeps its repo-relative
  location under `localPath` (`base/` → `deps/chromium/base/`). This preserves the
  upstream layout, which matters when vendored build files use absolute, repo-root
  paths (e.g. GN's `//base`).
- **`.syncignore` still applies** for fine-grained trimming _within_ the selected
  directories (e.g. drop `base/test/`).
- It is **mutually exclusive** with `subDir`.
- Entries may also be **files** (e.g. `"LICENSE"` at the repo root) to vendor
  single files outside the listed directories.
- The clone uses **`--no-checkout`** so the entire default branch is never
  materialized before sparse-checkout narrows it; hydration happens once, at the
  sparse target checkout.

#### Treeless clones for very large repos (`cloneFilter`)

By default fork-sync clones with `--filter=blob:none` (file contents fetched on
demand). For a **huge** upstream where you only vendor a small subset, the trees
themselves dominate the download. Set `cloneFilter` to `tree:0` to defer trees as
well — combined with `sparsePaths`, only the trees/blobs along the selected paths
are ever fetched, shrinking the initial clone by orders of magnitude:

```json
{ "cloneFilter": "tree:0", "sparsePaths": ["base", "sandbox"] }
```

Trade-off: `tree:0` makes later **history-walking** operations (the 3-way-merge
re-sync, PR-note `git log`) fetch trees on demand, so they are slower. A **first
sync** runs no merge, so `tree:0` is essentially free for the initial import. On
repos the size of Chromium these on-demand fetches can take very long or fail;
use `fetchMode: "snapshot"` instead.

#### Snapshot mode (`fetchMode: "snapshot"`)

The default `history` mode keeps a partial clone of the upstream history in
`.sync/<dep>/` and merges the target commit into the base commit. Snapshot mode
needs no history at all, which makes it the right choice for very large repos
and for release tags that live on separate branches:

```json
{
  "repo": "https://chromium.googlesource.com/chromium/src",
  "branch": "main",
  "commit": "a1956b5dc600da374ac77dae6723e664488f09c2",
  "tag": "149.0.7827.149",
  "fetchMode": "snapshot",
  "sparsePaths": ["LICENSE", "base", "sandbox", "build"]
}
```

In snapshot mode fork-sync:

- resolves `--tag`/`--branch` with `git ls-remote` (no local tags needed;
  `--commit` must be a full SHA),
- fetches **only the base and target commits** (`--depth=1`) into
  `.sync/<dep>/`,
- builds two synthetic commits containing just the synced scope, the target
  parented on the base, so the 3-way merge base is **exactly** the last synced
  commit — even when the target is not a descendant of it (e.g.
  `149.0.7827.149` → `156.0.8078.48`),
- links the upstream range in the PR notes instead of listing every commit.

Conflict resolution, `--continue`, `--abort`, and PR creation work as in history
mode. The first snapshot sync of a big repo downloads one full snapshot (for
Chromium about 1.4 GB); later syncs only fetch what changed.

#### Git submodules (`submodules`)

Many large repos pull third-party code in as git submodules. Their content is
not part of the superproject's tree (only a _gitlink_ pinning a commit of another
repo), so it is normally invisible to fork-sync. List the submodules to follow
by their path in the superproject:

```json
{
  "fetchMode": "snapshot",
  "submodules": {
    "third_party/boringssl/src": {},
    "third_party/perfetto": {
      "fallbackUrls": ["https://github.com/google/perfetto"]
    }
  }
}
```

For each listed submodule fork-sync reads the URL from upstream's
`.gitmodules` and the pinned SHA from the gitlink **at the base and at the
target commit**, fetches both, and grafts the submodule's files into the synced
tree in place of the gitlink. The SHAs are never written to the config: they move
with the superproject, so a sync always vendors the versions upstream tested
together. Everything else (3-way merge of local edits, conflicts, `.syncignore`,
deletions) works on submodule files exactly as on the superproject's own files.

- `fallbackUrls` are tried in order when the `.gitmodules` URL cannot serve a
  pinned commit (mirrors occasionally drop old commits). Commit SHAs pin the
  content, so a fallback changes availability, not content. The PR notes flag
  every fallback, and any change of a submodule's `.gitmodules` URL between the
  base and target commits.
- Like `git submodule`, URLs taken from upstream's `.gitmodules` may not use the
  local `file` transport (unless the upstream repo itself is local), so an
  upstream cannot make fork-sync vendor files from your disk. `fallbackUrls`
  come from your config and are trusted.
- A listed path that is no longer a gitlink at the target stops the sync, so the
  config is updated deliberately.
- Gitlinks inside the synced scope that are **not** listed are ignored and
  reported in the PR notes (including ones that appeared or disappeared), as a
  review checkpoint for new third-party code.
- Nested submodules (submodules of a followed submodule) are not followed.

#### Pruned forks (`keepLocalDeletions`)

Some forks vendor only part of what the selected directories contain — e.g.
just the files their build needs. Without this option, every sync re-adds the
files the fork deleted unless `.syncignore` lists each of them. With
`keepLocalDeletions: true` (snapshot mode):

- a file that exists at the base commit but **not** in the vendored copy stays
  absent, even if upstream changes it (the PR notes count these),
- **new** upstream files are added (filter categories you never want with
  `.syncignore`),
- local files are deleted only when **upstream deleted** them; files that only
  exist locally are never deleted,
- a `sparsePaths` entry or submodule with **no** local files yet (just added to
  the config) is imported in full rather than treated as removed,
- fork-sync warns when a vendored file is hidden by `.syncignore` but still
  exists upstream, since such a file would silently stop updating; re-include it
  with a `!` pattern.

To bring back a file you previously removed, copy it from upstream into the
vendored copy and commit it; later syncs track it again. A removed file that
upstream renames comes back under its new name, like any new upstream file.

### .syncignore

Place a `.syncignore` file in the dependency's local directory (e.g.,
`external/icu-small/.syncignore`) to exclude files and folders from sync. Uses
standard `.gitignore` syntax.

```gitignore
# Exclude local-only build files
/CMakeLists.txt
/hermes_icu_glue.cpp

# Exclude local-only metadata
/sync-config.json
/.syncignore
```

Excluded files are not copied from upstream and are not deleted locally.

#### Anchored vs unanchored patterns

Patterns follow `.gitignore` rules. A leading `/` anchors the pattern to the
directory where the `.syncignore` file is located:

| Pattern           | Matches                       | Does not match       |
| ----------------- | ----------------------------- | -------------------- |
| `/CMakeLists.txt` | `CMakeLists.txt` at the root  | `sub/CMakeLists.txt` |
| `CMakeLists.txt`  | `CMakeLists.txt` at any depth | —                    |
| `/test/`          | `test/` directory at the root | `sub/test/`          |

#### Selective inclusion with negation (`!`)

To exclude most content and re-include specific parts, use negation patterns.
**Important:** gitignore cannot re-include children of an excluded parent
directory. Exclude the _children_, not the parent:

```gitignore
# WRONG — negation won't work because parent is excluded:
/test/
!/test/intl402/

# CORRECT — exclude children individually, then negate one:
/test/*/
!/test/intl402/
```

This is useful for large repos where you only need a subset. For example, to
sync only `test/intl402/` and `harness/` from a test suite:

```gitignore
# Exclude repo infrastructure
/.github/
/docs/
/tools/
/package.json

# Exclude all test suites, re-include only intl402
/test/*/
!/test/intl402/
```

### sync-instructions.md

Place `sync-instructions.md` files in any directory within the dependency to
give the AI merge tool additional context about how conflicts should be
resolved. These are collected from the repository root down to the directory of
the file being merged (general to specific), and included in the AI prompt.

For example, with this directory structure:

```
deps/nodejs/
  sync-instructions.md          # General instructions for the whole dependency
  src/
    sync-instructions.md        # More specific instructions for src/
    node_api.cc                 # When merging this file, both files above apply
```

When resolving conflicts in `src/node_api.cc`, both instruction files are
included — root-level first, then the more specific `src/` one. Use these files
to describe local conventions, intentional divergences from upstream, or
domain-specific merge guidance.

## Requirements

- Node.js ^20.16.0 or >=22.4.0
- Git 2.25 or later
- For AI merge: GitHub Copilot CLI (`copilot`, default) or Claude Code
  (`claude`)
