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
    "provider": "claude",
    "model": "haiku",
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

| Field                      | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `version`                  | Must be `1`                                                                        |
| `aiMerge.provider`         | AI provider: `"claude"` or `"copilot"`                                             |
| `aiMerge.model`            | Model name (optional, provider-specific)                                           |
| `aiMerge.minConfidence`    | Minimum confidence to apply a hunk: `"HIGH"`, `"MEDIUM"` (default), or `"LOW"`     |
| `dependencies[].name`      | Unique name for the dependency (used in `--dep` flag)                              |
| `dependencies[].localPath` | Path to the vendored copy, relative to the manifest. Use `"."` for full-repo forks |

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

| Field      | Description                                                                |
| ---------- | -------------------------------------------------------------------------- |
| `repo`     | Full HTTPS URL of the upstream repository                                  |
| `branch`   | Upstream branch to track                                                   |
| `commit`   | Last synced upstream commit hash (empty string for first sync)             |
| `subDir`   | Subfolder within the upstream repo to sync (optional, omit for whole repo) |
| `tag`      | Tag name if synced to a tag (empty string otherwise)                       |
| `lastSync` | ISO timestamp of last sync (empty string if never synced)                  |

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
- Git
- For AI merge: Claude CLI (`claude`) or GitHub Copilot CLI (`copilot`)
