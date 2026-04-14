// @ts-check

/**
 * Coerces number/string literals to literal types.
 * @template {number | string} T
 * @param {T} v
 * @return {T}
 */
export function c(v) {
  return v;
}

/**
 * Concatenates specified strings.
 * @param {string[]} strings
 * @returns {string}
 */
export function concatStrings(...strings) {
  return strings.concat("").join("\n");
}

/**
 * Trims specified string for wrapping quotation marks.
 * @param {string} p
 * @returns {string}
 */
export function trimQuotes(p) {
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    return p.slice(1, p.length - 1);
  }
  return p;
}
