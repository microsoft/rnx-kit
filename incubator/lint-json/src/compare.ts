import { isRecord } from "./utilities.ts";

/**
 * Does a deep equality check of two values. Will check objects and arrays recursively. Objects are
 * treated as ordered structures as they are written to JSON in a specific order and a mismatch indicates
 * a change is needed.
 * @param value1 The first value to compare.
 * @param value2 The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export function compareValues(value1: unknown, value2: unknown): boolean {
  // short-circuit for primitive equality and identical object references
  if (value1 === value2) {
    return true;
  }

  // only non-null objects need to have special handling, otherwise fall through to false below
  if (
    typeof value1 === "object" &&
    typeof value2 === "object" &&
    value1 !== null &&
    value2 !== null
  ) {
    // handle the both objects are arrays case, in this case walk through them and compare each value deeply
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return compareArrays(value1, value2);
    }

    // handle the both plain objects case, checking keys including key ordering and comparing values deeply
    if (isRecord(value1) && isRecord(value2)) {
      return compareObjects(value1, value2);
    }
  }
  // already did the === check at the top of the function
  return false;
}

/**
 * Performs a deep equality check of two arrays, comparing each element recursively using `compareValues`.
 * @param array1 The first array to compare.
 * @param array2 The second array to compare.
 * @returns True if the arrays are equal, false otherwise.
 */
function compareArrays(array1: unknown[], array2: unknown[]): boolean {
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length; i++) {
    if (!compareValues(array1[i], array2[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Performs a deep equality check of two objects, comparing each key and value recursively using `compareValues`.
 * The order of keys is significant and must match exactly for the objects to be considered equal.
 * @param obj1 The first object to compare.
 * @param obj2 The second object to compare.
 * @returns True if the objects are equal, false otherwise.
 */
function compareObjects(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
): boolean {
  const keys = Object.keys(obj1);
  if (!compareArrays(keys, Object.keys(obj2))) {
    return false;
  }
  for (const key of keys) {
    if (!compareValues(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}
