/**
 * Returns whether `property` exists in `obj`.
 *
 * @param obj The object to examine
 * @param property The property to look for
 * @returns Whether `obj` contains `property`
 */
export function hasProperty<Property extends string>(
  obj: unknown,
  property: Property
): obj is Record<Property, unknown> {
  return typeof obj === "object" && obj !== null && property in obj;
}

/**
 * Returns the names of the enumerable string properties of an object.
 * Equivalent to calling `Object.keys()`, but type safe.
 * @param obj Object that contains the properties
 * @returns Type-safe array of properties of the specified object
 */
export function keysOf<T extends Record<string, unknown>>(
  obj: T | undefined
): (keyof T)[] {
  return obj ? Object.keys(obj) : [];
}

/**
 * Pick the value for each `key` property from `obj` and return each one in a new object.
 * If `names` are given, use them in the new object, instead of `keys`.
 *
 * If any `key` was not found or its value was `undefined`, nothing will be picked for that key.
 *
 * @param obj Object to pick from
 * @param keys Keys to pick
 * @param names Optional names to use in the output object
 * @returns A new object containing a each `name` property and the picked value, or `undefined` if no keys were picked.
 */
export function pickValues<T>(
  obj: T,
  keys: (keyof T)[],
  names?: string[]
): Record<string, unknown> | undefined {
  const finalNames = names ?? keys;
  const results: Record<string, unknown> = {};

  let pickedValue = false;
  for (let index = 0; index < keys.length; ++index) {
    const value = obj[keys[index]];
    if (typeof value !== "undefined") {
      results[finalNames[index].toString()] = value;
      pickedValue = true;
    }
  }

  return pickedValue ? results : undefined;
}
