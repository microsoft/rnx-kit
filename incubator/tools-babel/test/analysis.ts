// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNode = Record<string, any>;

/**
 * Compare two AST nodes recursively and collect differences.
 * Ignores loc, start, end, and comments fields.
 */
export function diffAst(
  oxc: AnyNode | null | undefined,
  babel: AnyNode | null | undefined,
  nodePath: string,
  diffs: string[],
  maxDiffs = 30
): void {
  if (diffs.length >= maxDiffs) return;

  if (oxc === babel) return;
  if (oxc == null && babel == null) return;

  if (oxc == null || babel == null) {
    diffs.push(
      `${nodePath}: oxc=${JSON.stringify(oxc)}, babel=${JSON.stringify(babel)}`
    );
    return;
  }

  if (typeof oxc !== typeof babel) {
    diffs.push(
      `${nodePath}: type mismatch oxc=${typeof oxc} babel=${typeof babel}`
    );
    return;
  }

  if (typeof oxc !== "object") {
    if (oxc !== babel) {
      diffs.push(
        `${nodePath}: oxc=${JSON.stringify(oxc)}, babel=${JSON.stringify(babel)}`
      );
    }
    return;
  }

  if (Array.isArray(oxc) && Array.isArray(babel)) {
    if (oxc.length !== babel.length) {
      diffs.push(
        `${nodePath}: array length oxc=${oxc.length}, babel=${babel.length}`
      );
    }
    const len = Math.min(oxc.length, babel.length);
    for (let i = 0; i < len; i++) {
      diffAst(oxc[i], babel[i], `${nodePath}[${i}]`, diffs, maxDiffs);
    }
    return;
  }

  // skip fields that are expected to differ
  const skip = new Set([
    "loc",
    "start",
    "end",
    "comments",
    "leadingComments",
    "trailingComments",
    "innerComments",
    "tokens",
  ]);

  const allKeys = new Set([...Object.keys(oxc), ...Object.keys(babel)]);
  for (const key of allKeys) {
    if (skip.has(key)) continue;
    if (!(key in oxc) && key in babel) {
      // babel has a field oxc doesn't
      const val = babel[key];
      // ignore undefined/null fields in babel
      if (val != null) {
        diffs.push(
          `${nodePath}.${key}: missing in oxc, babel=${JSON.stringify(val).slice(0, 80)}`
        );
      }
    } else if (key in oxc && !(key in babel)) {
      const val = (oxc as AnyNode)[key];
      if (val != null) {
        diffs.push(
          `${nodePath}.${key}: extra in oxc=${JSON.stringify(val).slice(0, 80)}`
        );
      }
    } else {
      diffAst(
        (oxc as AnyNode)[key],
        (babel as AnyNode)[key],
        `${nodePath}.${key}`,
        diffs,
        maxDiffs
      );
    }
  }
}

/**
 * Fields that are expected to differ between OXC and Babel ASTs.
 * Comments are handled separately and loc/position fields vary by design.
 */
const IGNORED_FIELDS = new Set([
  "loc",
  "start",
  "end",
  "comments",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "tokens",
]);

/**
 * Recursively compare two AST nodes and return the number of differences.
 */
export function countDiffs(
  oxc: AnyNode | null | undefined,
  babel: AnyNode | null | undefined,
  maxDiffs = 100
): number {
  let count = 0;

  function walk(
    a: AnyNode | null | undefined,
    b: AnyNode | null | undefined
  ): void {
    if (count >= maxDiffs) return;
    if (a === b) return;
    if (a == null && b == null) return;
    if (a == null || b == null) {
      count++;
      return;
    }
    if (typeof a !== typeof b) {
      count++;
      return;
    }
    if (typeof a !== "object") {
      if (a !== b) count++;
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) count++;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) walk(a[i], b[i]);
      return;
    }
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if (IGNORED_FIELDS.has(key)) continue;
      if (!(key in a) && key in b) {
        if (b[key] != null) count++;
      } else if (key in a && !(key in b)) {
        if ((a as AnyNode)[key] != null) count++;
      } else {
        walk((a as AnyNode)[key], (b as AnyNode)[key]);
      }
    }
  }

  walk(oxc as AnyNode, babel as AnyNode);
  return count;
}
