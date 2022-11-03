/**
 * Pick the value for property `key` from `obj` and return it in a new object.
 * If `name` is given, use it in the new object, instead of `key`.
 *
 * If `key` was not found or its value is `undefined`, nothing will be picked.
 *
 * @param obj Object to pick from
 * @param key Key to pick
 * @param name Optional name to use in the output object
 * @returns An object containing a single `name` property and the picked value, or `undefined` if nothing was picked.
 */
export function pickValue<T>(
  obj: T,
  key: keyof T,
  name?: string
): { [name: string]: unknown } | undefined {
  const value = obj[key];
  return typeof value !== "undefined" ? { [name ?? key]: value } : undefined;
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

/**
 * Add properties to an object, changing it from its current type to an extended type.
 *
 * Properties are added in-place, and the original object reference is returned as the extended type.
 *
 * @param obj Object to extend
 * @param extendedProps Properties to add to the object, extending it
 * @returns The original object reference as the extended type
 */
export function extendObject<
  T extends Record<string, unknown>,
  TExtended extends T
>(obj: T, extendedProps: Omit<TExtended, keyof T>): TExtended {
  return Object.assign(obj, extendedProps) as TExtended;
}

/**
 * Add properties to each object in an array, changing the object from its current type to an extended type.
 *
 * Properties are added in-place, and the original object array reference is returned as the extended array type.
 *
 * @param arr Array of objects to extend
 * @param extendedProps Properties to add to each object in the array, extending it
 * @returns The original object array reference as the extended array type
 */
export function extendObjectArray<
  T extends Record<string, unknown>,
  TExtended extends T
>(arr: T[], extendedProps: Omit<TExtended, keyof T>): TExtended[] {
  arr.map((obj) => Object.assign(obj, extendedProps));
  return arr as TExtended[];
}

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
