import type { TableViewParts, TreeViewParts } from "./types.ts";

export const ELLIPSIS = "...";
export const SRC_DIRS = ["src", "lib", "dist", "bin"];
export const SEPARATORS = ["/", "\\"];

type StyleKeys = "default" | "ascii";

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
