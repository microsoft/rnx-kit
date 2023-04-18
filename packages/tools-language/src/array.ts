/**
 * Returns whether the specified object is a non-empty array.
 * @param array The array to check
 */
export function isNonEmptyArray<T = unknown>(array: unknown): array is T[] {
  return Array.isArray(array) && array.length > 0;
}
