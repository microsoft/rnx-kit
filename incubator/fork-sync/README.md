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

# Run AI merge on all conflicted files (default)
fork-sync --dep <name> --mergetool ai

# Use git's built-in mergetool instead
fork-sync --dep <name> --mergetool git
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
      "name": "nodejs",
      "localPath": "deps/nodejs"
    }
  ]
}
```

| Field                      | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| `version`                  | Must be `1`                                                                    |
| `aiMerge.provider`         | AI provider: `"claude"` or `"copilot"`                                         |
| `aiMerge.model`            | Model name (optional, provider-specific)                                       |
| `aiMerge.minConfidence`    | Minimum confidence to apply a hunk: `"HIGH"`, `"MEDIUM"` (default), or `"LOW"` |
| `dependencies[].name`      | Unique name for the dependency (used in `--dep` flag)                          |
| `dependencies[].localPath` | Path to the vendored copy, relative to the manifest                            |

### sync-config.json

Each dependency needs a `sync-config.json` in its local directory (e.g.,
`deps/nodejs/sync-config.json`). This file tells `fork-sync` where to fetch
upstream code from and tracks the last synced commit. It is auto-updated after
each successful sync.

```json
{
  "repo": "https://github.com/nodejs/node",
  "branch": "v24.x",
  "commit": "abc1234def5678...",
  "tag": "",
  "lastSync": "2025-06-15T10:30:00.000Z"
}
```

| Field      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `repo`     | Full HTTPS URL of the upstream repository                      |
| `branch`   | Upstream branch to track                                       |
| `commit`   | Last synced upstream commit hash (empty string for first sync) |
| `tag`      | Tag name if synced to a tag (empty string otherwise)           |
| `lastSync` | ISO timestamp of last sync (empty string if never synced)      |

### .syncignore

Place a `.syncignore` file in the dependency's local directory (e.g.,
`deps/nodejs/.syncignore`) to exclude files and folders from sync. Uses standard
`.gitignore` syntax.

```gitignore
# Exclude CI/CD configs we don't need
.github/
.devcontainer/

# Exclude docs
docs/
*.md
```

Excluded files are not copied from upstream and are not deleted locally.

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
