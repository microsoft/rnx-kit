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
