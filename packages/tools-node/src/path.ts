/**
 * Escape a path by replacing each backslash ('\\') with a double-backslash ("\\\\").
 *
 * @param p Path to escape
 * @returns Escaped path
 */
export function escapePath(p: string): string {
  return p.replace(/\\/g, "\\\\");
}

/**
 * Normalize the separators in a path, converting each backslash ('\\') to a foreward
 * slash ('/').
 *
 * @param p Path to normalize
 * @returns Normalized path
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
