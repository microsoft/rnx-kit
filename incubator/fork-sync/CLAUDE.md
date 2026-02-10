<!-- ============================================================
     STOP! READ THESE RULES BEFORE DOING ANYTHING
     ============================================================ -->

> **MANDATORY RULES**
>
> 1. **DISCUSS before implementing** - Answer questions first, code after
>    agreement
> 2. **Use `node` directly for TypeScript** - NOT tsx, ts-node, or tsc
> 3. **Check the platform** - Claude Code knows the OS (`Platform:` in system
>    prompt). Follow the platform-specific rules below.

---

# fork-sync Development Guide

Sync forked/vendored dependencies with upstream using Git 3-way merge with
AI-assisted conflict resolution.

## Quick Reference

```bash
yarn build        # Compile TypeScript to lib/
yarn test         # Run all tests (fast: skips slow integration tests)
yarn test:all     # Run all tests including slow integration tests
yarn lint         # Check linting (ESLint)
yarn format       # Check formatting (Prettier)
yarn fix          # Fix everything: typecheck + format + lint:fix
```

**Note:** Claude/Copilot integration tests are slow (invoke external CLIs) and
are skipped by default. Use `yarn test:all` or set `RUN_INTEGRATION=1` to
include them.

## Important: Discuss Before Implementing

**When the user asks a question, ANSWER the question and DISCUSS solutions with
them.** Do not immediately jump to writing code or creating files. Have a
conversation first to understand what approach they prefer, then implement only
after getting agreement.

## Platform-Specific Rules

Claude Code reports the current platform in the system prompt as `Platform:`.
Check it and follow the appropriate rules below.

### Windows (`Platform: win32`)

**Claude Code's Bash tool runs bash even on Windows.** Bash does not understand
Windows paths or `.cmd` files natively. Wrap commands in `powershell -Command`:

```bash
# CORRECT:
powershell -Command "cd 'e:\GitHub\microsoft\rnx-kit\incubator\fork-sync'; yarn test"
powershell -Command "cd 'e:\GitHub\microsoft\rnx-kit\incubator\fork-sync'; yarn fix"

# WRONG - bash doesn't understand Windows paths:
cd e:\path; command                    # FAILS
cd /d "e:\path" && command             # FAILS
```

**Key pattern:** `powershell -Command "cd 'FULL_PATH'; command"`

#### The "nul" File Problem

On Windows, `nul` is a reserved device name. **NEVER redirect to `nul`** — it
creates an undeletable file:

```bash
# NEVER DO THIS on Windows:
command 2>nul         # Creates undeletable "nul" file!
command 2>/dev/null   # Same problem!
some_command > nul    # Same problem!

# CORRECT:
powershell -Command "command 2>`$null"
command 2>&1          # Or just merge streams
```

#### Forbidden Shell Commands on Windows

- **DO NOT** use `mkdir -p` (use `New-Item -ItemType Directory -Force`)
- **DO NOT** use `rm -rf` (use `Remove-Item -Recurse -Force`)
- **DO NOT** use `cat`, `grep`, `sed`, `awk` (use PowerShell equivalents or
  Claude Code's Read/Grep tools)
- **DO NOT** use Unix path separators in shell commands (use `\` or let Node.js
  handle paths)

### macOS / Linux (`Platform: darwin` or `Platform: linux`)

Standard bash commands work natively. No PowerShell wrapping needed:

```bash
cd /path/to/rnx-kit/incubator/fork-sync && yarn test
yarn fix
```

**Still avoid destructive commands** (`rm -rf`, `git clean -f`, etc.) without
user confirmation — these are dangerous on any platform.

## Running TypeScript Scripts

**Node.js 22.6+ runs TypeScript files directly** via built-in "type stripping" -
it removes type annotations and runs the resulting JavaScript. No compilation
step, no external tools needed.

```bash
# CORRECT - use node directly:
node src/sync.ts --help

# WRONG - do NOT use these:
# node --experimental-strip-types ...  # WRONG - flag not needed in Node 23.6+/22.18+
# npx tsx src/sync.ts                  # WRONG - external tool not needed
# npx ts-node src/sync.ts             # WRONG - external tool not needed
# tsc src/sync.ts                     # WRONG - compilation not needed
```

### Limitations

Type stripping only works with "erasable" TypeScript syntax. The following
features require `--experimental-transform-types`:

- `enum` declarations (use `const` objects or union types instead)
- Constructor parameter properties (`constructor(public x: number)`)
- `namespace` declarations
- `const enum`

## Project Structure

```
incubator/fork-sync/
  src/
    sync.ts              # Main sync CLI
    ai-merge.ts          # AI-powered merge conflict resolver CLI
    modules/             # Reusable modules
  test/                  # Unit tests (Node.js test runner)
  harness/               # Manual test harnesses
  ai-merge-prompt.md     # Merge conflict resolution prompt template
  lib/                   # Build output (gitignored)
```

### Main Scripts

- `src/sync.ts` - Dependency sync tool (published as `fork-sync` CLI)
- `src/ai-merge.ts` - Hunk-based merge conflict resolver (published as
  `ai-merge` CLI)
- `ai-merge-prompt.md` - Prompt template for AI conflict resolution

### Modules (`src/modules/`)

Reusable modules imported by the main scripts:

- `merge-hunks.ts` - Hunk parsing and coalescing logic
- `job-ui.ts` - Concurrent task scheduler with progress UI
- `claude.ts` - Claude CLI integration
- `copilot.ts` - GitHub Copilot CLI integration
- `ai-prompt-template.ts` - Prompt template parsing
- `tty-ui.ts` - TTY colors, icons, and progress UI
- `log.ts` - Logging module (console + file logging)
- `parallel.ts` - Async iterator utilities for parallel processing
- `proc.ts` - Async wrapper around child_process.spawn
- `queue.ts` - Generic FIFO queue with O(1) amortized operations
- `fs.ts` - File system utilities
- `git.ts` - Git command wrappers
- `common.ts` - Shared types and constants

### Tests (`test/`)

Unit tests using Node.js test runner:

```bash
yarn test                               # Run fast tests (skips integration)
yarn test:all                           # Run all tests including integration
node --test test/merge-hunks.test.ts    # Run specific test file
```

**Integration tests** (claude.test.ts, copilot.test.ts) call external CLIs and
are slow. They are skipped by default and only run when `RUN_INTEGRATION=1` is
set.

### Harness (`harness/`)

Manual test harnesses for development:

- `harness/ai-merge-harness.ts` - Test harness for merge conflicts
- `harness/job-harness.ts` - Job/task UI demo
- `harness/progress-harness.ts` - Progress UI demo

## How Sync Works

1. Clones upstream repo to `.sync/<dep>/`
2. Creates a branch with local changes from the vendored directory
3. Performs Git 3-way merge with target upstream commit
4. AI resolves conflicts automatically (if configured)
5. Copies merged result back to the vendored directory
6. Updates `sync-manifest.ts` with new commit hash

### AI-Assisted Conflict Resolution

When merge conflicts occur, `ai-merge` resolves them hunk-by-hunk with
confidence-based validation:

1. **Parse**: Extract conflict hunks from KDiff3/diff3 markers, reconstruct
   local/base/remote file versions
2. **Coalesce**: Merge nearby hunks (< 3 lines apart) to reduce AI calls
3. **Resolve per-hunk**: Send each hunk (with ±5 lines of context) to AI for
   resolution
4. **Validate**: A separate AI call scores each resolution as HIGH, MEDIUM, or
   LOW confidence
5. **Apply or retry**: If confidence >= threshold (default: MEDIUM), apply the
   resolved hunk; otherwise retry up to the retry limit, then skip
6. **Reconstruct**: Rebuild the file with resolved hunks; unresolved hunks keep
   their conflict markers

**Two modes of operation:**

- **Single-file mode** (default): Processes one file, called by Git's mergetool
  system (`--base`, `--local`, `--remote`, `--merged`)
- **Batch mode** (`--merge-all`): Discovers all conflicted files via
  `git diff --diff-filter=U`, processes all hunks across all files in a single
  parallel pool, auto-stages fully resolved files

Binary files are skipped. Unresolved files can optionally launch a fallback
merge tool (e.g., meld, vimdiff).

## Logging

Both `sync.ts` and `ai-merge.ts` support logging via `src/modules/log.ts`.

### Log Flags

```bash
--log-dir <path>      # Log file directory (default: .logs/ at repo root)
--log-level <level>   # Log level: none, error, default, debug
```

### Log Levels

| Level     | Console Output    | File Output           |
| --------- | ----------------- | --------------------- |
| `none`    | info, warn, error | (no file)             |
| `error`   | info, warn, error | error only            |
| `default` | info, warn, error | info, warn, error     |
| `debug`   | info, warn, error | all (including debug) |

**Console always shows info/warn/error.** Debug messages only go to file.

## Creating New Files

When creating new files, **always check existing files in the same directory
first** to match conventions:

1. **File headers**: All modules have a Microsoft copyright header followed by a
   JSDoc module comment
2. **Module documentation**: Include a comprehensive JSDoc block with:
   - One-line description
   - "This module provides:" section listing the API with `**bold**` names
   - Implementation notes (if relevant)
   - `@example` block with realistic usage
   - `@module` tag
3. **Code style**: Match existing patterns for exports, naming, and organization

See `src/modules/tty-ui.ts` or `src/modules/queue.ts` for examples of
well-documented modules.

## Build

This package is part of the rnx-kit monorepo. It uses:

- **Build**: `rnx-kit-scripts build` (runs `tsc --outDir lib`)
- **Lint**: `rnx-kit-scripts lint` (ESLint with `@rnx-kit/eslint-config`)
- **Format**: `rnx-kit-scripts format` (Prettier with monorepo config)
- **Test**: `rnx-kit-scripts test` (Node.js test runner, globs
  `test/**/*.test.ts`)
- **tsconfig**: extends `@rnx-kit/tsconfig/tsconfig.esm.node.json`

Output goes to `lib/` (gitignored). Source is ESM (`"type": "module"`).

Zero runtime dependencies - only uses Node.js builtins.
