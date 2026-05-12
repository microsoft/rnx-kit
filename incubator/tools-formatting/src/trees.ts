import { TREE_STYLES } from "./const.ts";
import type { TreeFormattingOptions } from "./types.ts";

/**
 * Format a header and a list of rows into a tree-like string representation using the
 * specified tree formatting options.
 * @param header header text to display at the top of the tree
 * @param rows array of strings representing each row to display under the header
 * @param options tree formatting options to control the appearance of the tree
 * @returns a string representing the formatted tree. There will be no trailing newline.
 */
export function formatAsTree(
  header: string,
  rows: string[],
  options: TreeFormattingOptions = {}
): string {
  const { asciiOnly, treeParts } = options;
  const indent = resolveIndent(options.indent);

  const treeStyle =
    treeParts ?? (asciiOnly ? TREE_STYLES.ascii : TREE_STYLES.default);

  let result = header;

  for (let i = 0; i < rows.length; i++) {
    const isLast = i === rows.length - 1;
    const [branch, cont] = isLast ? treeStyle.last : treeStyle.row;
    const lines = rows[i].split("\n");
    for (let j = 0; j < lines.length; j++) {
      result += "\n" + indent + (j === 0 ? branch : cont) + lines[j];
    }
  }
  return result;
}

/**
 * Resolve the indent value into a string. If a number is provided, it will be converted
 * into that many spaces. If a string is provided, it will be returned as-is. Falsy
 * values resolve to an empty string.
 */
function resolveIndent(indent: TreeFormattingOptions["indent"]): string {
  // undefined or falsy indent resolves to empty string
  if (!indent) {
    return "";
  }
  if (typeof indent === "number") {
    return " ".repeat(Math.max(0, indent));
  }
  return indent;
}
