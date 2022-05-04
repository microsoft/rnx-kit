/**
 * Convert an array offset to an array index. An offset can be positive or
 * negative, while an index is always positive.
 *
 * A negative offset is converted to an index starting from end of the array,
 * and counting backwards toward the front.
 *
 * @param array Array
 * @param offset Offset
 * @returns
 */
export function toIndex<T>(array: readonly T[], offset: number): number {
  return offset < 0 ? array.length + offset : offset;
}

/**
 * Add elements from one array to another, returning the resulting array.
 *
 * Elements are added in-place. `undefined` elements are skipped. When `to`
 * isn't set, a new array is returned.
 *
 * @param to Elements are added to this array. If `undefined`, a new array is created.
 * @param from Elements are read from this array. `undefined` elements are skipped.
 * @param start Optional. Starting offset of the range for reading `from` elements. Defaults to `0`.
 * @param end Optional. Ending offset of the range for reading `from` elements. Defaults to `from.length`.
 * @returns Array containing `to` and `from` elements.
 */
export function addRange<T>(
  to: T[] | undefined,
  from: readonly T[] | undefined,
  start?: number,
  end?: number
): T[] | undefined {
  if (from === undefined || from.length === 0) {
    return to;
  }
  if (to === undefined) {
    return from.slice(start, end);
  }
  start = start === undefined ? 0 : toIndex(from, start);
  end = end === undefined ? from.length : toIndex(from, end);
  for (let i = start; i < end && i < from.length; i++) {
    if (from[i] !== undefined) {
      to.push(from[i]);
    }
  }
  return to;
}

/**
 * Returns whether the specified object is a non-empty array.
 * @param array The array to check
 */
export function isNonEmptyArray<T = unknown>(array: unknown): array is T[] {
  return Array.isArray(array) && array.length > 0;
}
