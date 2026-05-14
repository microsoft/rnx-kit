import type { TableViewParts, TreeViewParts } from "./types.ts";

export const REPORTER_ENV_KEY = "RNX_TARGET_REPORTER";
export const ELLIPSIS = "...";
export const SRC_DIRS = ["src", "lib", "dist", "bin"];
export const SEPARATORS = ["/", "\\"];

type StyleKeys = "default" | "ascii";

export const SEVERITY_LEVELS = {
  info: 0,
  warn: 1,
  error: 2,
} as const;

export const BUILTIN_REPORTERS = [
  "github",
  "azure",
  "console",
  "file",
] as const;

export const TREE_STYLES: Record<StyleKeys, TreeViewParts> = {
  default: {
    row: ["├── ", "│   "],
    last: ["└── ", "    "],
  },
  ascii: {
    row: ["+-- ", "|   "],
    last: ["`-- ", "    "],
  },
};

export const TABLE_STYLES: Record<StyleKeys, TableViewParts> = {
  default: {
    top: ["┌", "┬", "┐"],
    mid: ["├", "┼", "┤"],
    bottom: ["└", "┴", "┘"],
    row: ["│", "│", "│"],
    fill: "─",
  },
  ascii: {
    top: ["+", "+", "+"],
    mid: ["+", "+", "+"],
    bottom: ["+", "+", "+"],
    row: ["|", "|", "|"],
    fill: "-",
  },
};
