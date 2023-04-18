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
