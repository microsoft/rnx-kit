// This package is a *mock-up*. It demonstrates how a Prettier-compatible
// command line interface can be shimmed on top of `oxfmt`. The mapping table
// below is the heart of the shim: it declares, for every Prettier CLI flag we
// care about, whether it can be forwarded to `oxfmt` verbatim, rewritten to an
// `oxfmt` equivalent, handled entirely inside the shim, or ignored.
//
// The guiding assumptions (from the problem statement) are:
//
//   1. All formatting configuration lives in JSON config files
//      (`.oxfmtrc.json` / `.prettierrc`). Style flags passed on the command
//      line are therefore out of scope.
//   2. We only need enough of the surface for editor integrations — chiefly the
//      VS Code Prettier extension (`esbenp.prettier-vscode`) — to work.

/**
 * How a single Prettier CLI flag is handled by the shim.
 *
 * - `passthrough`: `oxfmt` accepts an identical flag; forward it unchanged.
 * - `rename`:      `oxfmt` has an equivalent spelled differently; rewrite it.
 * - `shim`:        No `oxfmt` equivalent, but editors rely on it; the shim
 *                  implements the behaviour itself.
 * - `ignore`:      Accepted for compatibility but has no effect (e.g. cache and
 *                  colour flags, or style flags that must come from the JSON
 *                  config instead of the command line).
 * - `reject`:      Explicitly unsupported; the shim errors out with guidance.
 */
export type FlagKind = "passthrough" | "rename" | "shim" | "ignore" | "reject";

export type FlagSpec = {
  /** How the shim treats this flag. */
  kind: FlagKind;
  /** Whether the flag consumes the following argument as its value. */
  takesValue?: boolean;
  /** For `rename`, the flag name (without leading dashes) `oxfmt` expects. */
  oxfmtName?: string;
  /** Short, single-character alias (without leading dash), if any. */
  short?: string;
  /** Human-readable note explaining the mapping decision. */
  note: string;
};

/**
 * The subset of the Prettier CLI we shim. Keyed by the long flag name without
 * the leading `--`.
 *
 * Only flags that editors (and CI) realistically pass are included. Everything
 * else falls through to `reject` so that silent misbehaviour is impossible.
 */
export const FLAG_MAP: Record<string, FlagSpec> = {
  // --- Directly forwarded: oxfmt understands these verbatim ------------------
  check: {
    kind: "passthrough",
    note: "Both tools exit non-zero when files are not formatted.",
  },
  write: {
    kind: "passthrough",
    note: "Format files in place. See note in `normalizeMode` about defaults.",
  },
  "list-different": {
    kind: "passthrough",
    short: "l",
    note: "List files that differ; identical semantics in oxfmt.",
  },
  "stdin-filepath": {
    kind: "passthrough",
    takesValue: true,
    note: "Editors pipe the buffer via stdin; oxfmt infers the parser from the path.",
  },
  config: {
    kind: "passthrough",
    takesValue: true,
    short: "c",
    note: "Explicit config file path. oxfmt: `-c, --config`.",
  },
  "ignore-path": {
    kind: "passthrough",
    takesValue: true,
    note: "Custom ignore file(s). oxfmt supports repeating this flag.",
  },
  "no-error-on-unmatched-pattern": {
    kind: "passthrough",
    note: "Do not fail when a glob matches nothing. Same name in oxfmt.",
  },
  "with-node-modules": {
    kind: "passthrough",
    note: "Include node_modules. Same name in oxfmt.",
  },
  version: {
    kind: "passthrough",
    short: "V",
    note: "Print version. (The shim overrides this to report both versions.)",
  },
  help: {
    kind: "passthrough",
    short: "h",
    note: "Print help.",
  },

  // --- Renamed: same concept, different spelling -----------------------------
  //
  // Prettier's `--no-config` disables config discovery; oxfmt's closest switch
  // is `--disable-nested-config`, which stops the *nested* directory search.
  "no-config": {
    kind: "rename",
    oxfmtName: "disable-nested-config",
    note: "Closest oxfmt equivalent for disabling config discovery.",
  },

  // --- Shimmed: no oxfmt flag, but editors depend on the behaviour -----------
  //
  // The VS Code extension calls these to decide whether a file is ignored and
  // which parser applies before it ever formats. oxfmt exposes no CLI switch
  // for them, so the shim resolves them itself (see `handleShimFlag`).
  "file-info": {
    kind: "shim",
    takesValue: true,
    note: "Report {ignored, inferredParser} for a path (Prettier-only).",
  },
  "find-config-path": {
    kind: "shim",
    takesValue: true,
    note: "Print the config file that governs a path (Prettier-only).",
  },
  "support-info": {
    kind: "shim",
    note: "Emit supported languages/options as JSON (Prettier-only).",
  },

  // --- Ignored: accepted for compatibility, no effect ------------------------
  //
  // Cache and colour flags are Prettier-only concerns. Editors sometimes pass
  // them; silently accepting keeps the shim drop-in without changing output.
  color: { kind: "ignore", note: "Colour handling is not modelled." },
  "no-color": { kind: "ignore", note: "Colour handling is not modelled." },
  cache: { kind: "ignore", note: "oxfmt has no persistent cache concept." },
  "no-cache": { kind: "ignore", note: "oxfmt has no persistent cache concept." },
  "cache-location": {
    kind: "ignore",
    takesValue: true,
    note: "oxfmt has no persistent cache concept.",
  },
  "cache-strategy": {
    kind: "ignore",
    takesValue: true,
    note: "oxfmt has no persistent cache concept.",
  },
  "log-level": {
    kind: "ignore",
    takesValue: true,
    note: "oxfmt has its own diagnostics; log level is not forwarded.",
  },
  loglevel: {
    kind: "ignore",
    takesValue: true,
    note: "Alias of --log-level accepted by older tooling.",
  },
};

/**
 * Style flags Prettier accepts on the command line. Per assumption (1), all
 * formatting configuration must come from JSON config files, so passing any of
 * these is an error the shim reports clearly rather than silently dropping.
 */
export const REJECTED_STYLE_FLAGS = new Set([
  "print-width",
  "tab-width",
  "use-tabs",
  "semi",
  "no-semi",
  "single-quote",
  "quote-props",
  "jsx-single-quote",
  "trailing-comma",
  "bracket-spacing",
  "bracket-same-line",
  "arrow-parens",
  "prose-wrap",
  "html-whitespace-sensitivity",
  "end-of-line",
  "embedded-language-formatting",
  "parser",
  "plugin",
]);
