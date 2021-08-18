/**
 * Decide if two numbers, integer or decimal, are "approximately" equal.
 * They're equal if they are close enough to be within the given tolerance.
 *
 * This is useful for comparing decimal values, as they aren't precise enough
 * to use equality.
 *
 * @param f1 First value to compare
 * @param f2 Second value to compare
 * @param tolerance Number indicating how far apart the first and second values can be before they are considered not equal.
 * @returns True if the difference between the first and second value is less than the tolerance
 */
export function isApproximatelyEqual(
  f1: number,
  f2: number,
  tolerance: number
): boolean {
  return Math.abs(f1 - f2) < tolerance;
}
