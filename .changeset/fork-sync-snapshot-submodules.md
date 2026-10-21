---
"@rnx-kit/fork-sync": minor
---

Support regular syncs of huge, submodule-based upstreams such as Chromium:

- `fetchMode: "snapshot"` — fetch only the base and target commits (depth 1) and merge synthetic snapshots of the synced scope whose merge base is exactly the last synced commit. Targets no longer need to descend from the base (e.g. release tags on different branches), tags resolve via `ls-remote`, and no upstream history cache is kept. PR notes link the upstream range instead of listing every commit.
- `submodules` — follow listed git submodules: their files are synced at the SHAs the upstream commit pins (base and target), with optional `fallbackUrls` when a mirror lost a pinned commit. `.gitmodules` URLs may not use the local `file` transport. PR notes list pin moves, URL changes, and gitlinks that appeared, disappeared, or are not followed.
- `keepLocalDeletions` — files removed from the vendored copy stay removed, new upstream files are added, and only files deleted upstream are deleted locally. Newly configured submodules and sparse paths are imported in full. Warns about vendored files hidden by `.syncignore` that would silently stop updating.
- `sparsePaths` entries may be files (e.g. `LICENSE`).
- History mode fetches a `--tag`/`--commit` that `git fetch` did not bring in, caps the PR-notes commit table at 200 rows, and skips submodule scanning, auto-gc, and commit-graph writing during fetches. A cached snapshot-mode repo is replaced when switching back to history mode.
- Change counts in the summary and PR notes now count every new file (previously one per new directory).
- `--continue` after manually resolving every conflict now clears the sync checkpoint, once the changes are applied; `--continue` refuses to resume if sync options changed while paused.
- Command output is decoded per stream, so multi-byte UTF-8 split across pipe chunks no longer turns into replacement characters.

AI merge:

- The GitHub Copilot CLI is now the default provider, and its default model is `auto` (Copilot routes each request; "Fusion" in VS Code), so no model ID goes stale.
- `aiMerge.model` (`--ai-model`) accepts an ordered list of models; when the CLI reports a model as not available, ai-merge warns and falls back to the next one, then to the CLI default.
- New `aiMerge.reasoningEffort` (`--ai-reasoning-effort`) for Copilot, default `low`; skipped automatically for models that do not support it.
- `aiMerge` settings are validated when the manifest loads, and model names are passed to the CLIs without shell interpretation.
- Fix hunks failing with "Context after mismatch" when the conflict's context ends with blank lines (e.g. the file's final newline).
