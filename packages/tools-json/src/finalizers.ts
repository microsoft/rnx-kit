import type { ReportingContext } from "./context.ts";
import type { Scope } from "./paths.ts";
import { asJsonArray, asJsonObject, type JsonObject } from "./values";

export type BaseFinalizerOptions = Scope & {
  /**
   * Override message for this rule
   */
  message?: string;
};

export type FinalizerType<TOptions extends BaseFinalizerOptions, TVal> = (
  value: TVal,
  reportOrFix: ReportingContext,
  options: TOptions
) => TVal | undefined;

/**
 * Check whether an array is alphabetized. Note that this converts to string values so it won't
 * work as expected for arrays of numbers, but works for keys, strings, and objects will all sort to the
 * same place in the order.
 * @param array input array
 * @returns boolean indicating whether the array needs alphabetization
 */
function needsAlphabetization(array: unknown[]): boolean {
  for (let i = 1; i < array.length; i++) {
    if (String(array[i - 1]) > String(array[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Finalizer to alphabetize the keys of a JSON object. This will not mutate the input object and will only
 * produce a new object if the keys are not in alphabetical order.
 * @param obj the JSON object to alphabetize
 * @param reportOrFix the reporting context for handling validation or fixing
 * @param options the finalizer options
 * @returns the JSON object with keys alphabetized
 */
export function alphabetizeObject<T extends JsonObject>(
  obj: T,
  reportOrFix: ReportingContext,
  options: BaseFinalizerOptions = {}
): T {
  if (obj) {
    const { message = `object should be in alphabetical order` } = options;
    const keys = Object.keys(obj);
    if (needsAlphabetization(keys)) {
      return reportOrFix(message, () => {
        const sortedObj: Record<string, unknown> = {};
        keys.sort();
        for (const key of keys) {
          sortedObj[key] = obj[key];
        }
        return sortedObj as T;
      });
    }
  }
  return obj;
}

/**
 * Finalizer to alphabetize the elements of a JSON array. This will not mutate the input array and will only
 * produce a new array if the elements are not in alphabetical order.
 * @param array the JSON array to alphabetize
 * @param reportOrFix the reporting context for handling validation or fixing
 * @param options the finalizer options
 * @returns the JSON array with elements alphabetized
 */
export function alphabetizeArray(
  array: unknown[],
  reportOrFix: ReportingContext,
  options: BaseFinalizerOptions = {}
): unknown[] {
  const { message = `array should be in alphabetical order` } = options;
  if (array && needsAlphabetization(array)) {
    return reportOrFix(message, () => {
      return [...array].sort();
    });
  }
  return array;
}

/**
 * Finalizer to remove any undefined values from the given object or array. This will not mutate the input and will only
 * produce a new object or array if there are undefined values that need to be removed.
 * @param obj the JSON object or array to remove undefined values from
 * @param reportOrFix the reporting context for handling validation or fixing
 * @param options the finalizer options
 * @returns the JSON object or array with undefined values removed
 */
export function noUndefinedValues<T>(
  obj: T,
  reportOrFix: ReportingContext,
  options: BaseFinalizerOptions = {}
) {
  const { message = `undefined values are not allowed in JSON` } = options;
  const objValue = asJsonObject(obj);
  if (objValue) {
    const keys = Object.keys(objValue);
    for (const key of keys) {
      if (objValue[key] === undefined) {
        return reportOrFix(message, () => {
          const newObj: Record<string, unknown> = {};
          for (const k of keys) {
            if (objValue[k] !== undefined) {
              newObj[k] = objValue[k];
            }
          }
          return newObj as T;
        });
      }
    }
  } else {
    const arrValue = asJsonArray(obj);
    if (arrValue) {
      for (let i = 0; i < arrValue.length; i++) {
        if (arrValue[i] === undefined) {
          return reportOrFix(message, () => {
            const newArr = arrValue.filter((item) => item !== undefined);
            return newArr as unknown as T;
          });
        }
      }
    }
  }
  return obj;
}

export type KeyOrderOptions = BaseFinalizerOptions & {
  /**
   * Bias for the key order. If "first", the specified keys will be ordered before any other keys. If "last", the specified
   * keys will be ordered after any other keys. Note that not all keys must be included in the keyOrder array, so if "first" is
   * set to "a", "b", "c", the order will still be satisfied with "a", "c", "d" but not with "a", "d", "c".
   * @default "normal"
   */
  bias?: "normal" | "first" | "last";

  /**
   * Enforce the order of keys in the object to match the provided array. Keys that are not included in the array
   * will be ordered after the specified keys in their original order. This is useful for enforcing a specific
   * order for important keys while allowing flexibility for less important ones.
   */
  keyOrder?: string[];
};

/**
 * Key order finalizer for JSON objects. Will validate and reorder the keys in the object based on the specified key order and
 * bias. This will not mutate the input object and will only produce a new object if the keys are not in the expected order.
 * @param obj the JSON object to enforce key order on
 * @param reportOrFix the reporting context for handling validation or fixing
 * @param options the key order options
 * @returns the JSON object with keys ordered according to the specified options
 */
export function enforceKeyOrder<T extends JsonObject>(
  obj: T,
  reportOrFix: ReportingContext,
  options: KeyOrderOptions
): T {
  const {
    bias = "normal",
    keyOrder,
    message = `object keys are not ordered as expected`,
  } = options;
  if (obj && keyOrder) {
    const keys = Object.keys(obj);
    const orderedKeys =
      bias === "normal"
        ? enforceNormalKeyOrder(keys, keyOrder)
        : enforceBiasedKeyOrder(keys, keyOrder, bias);
    // see if keys and ordered keys are in the same order
    if (!arraysEqual(keys, orderedKeys)) {
      return reportOrFix(message, () => {
        const newObj: Record<string, unknown> = {};
        for (const key of orderedKeys) {
          newObj[key] = obj[key];
        }
        return newObj as T;
      });
    }
  }
}

/**
 * Determines the new key order based on the specified key list for normal key ordering. In this case, any keys that aren't in the preferred key
 * order will be ordered in their original order after the last seen known keys.
 * @param keys the keys to order
 * @param keyOrder the key order from the setting
 * @returns the new key order based on the specified key list
 */
function enforceNormalKeyOrder(keys: string[], keyOrder: string[]): string[] {
  const orderedKeys = keyOrder.filter((k) => keys.includes(k));
  if (orderedKeys.length === 0) {
    return keys;
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!orderedKeys.includes(key)) {
      let insertIndex = 0;
      if (i > 0) {
        const prevKeyLocation = keyOrder.indexOf(keys[i - 1]);
        insertIndex =
          prevKeyLocation >= 0 ? prevKeyLocation + 1 : orderedKeys.length;
      }
      orderedKeys.splice(insertIndex, 0, key);
    }
  }
  return orderedKeys;
}

/**
 * Returns the preferred key order for the given keys based on the specified bias of first or last. If bias is "first",
 * any keys that exist must be in order at the start, if it is "last", they must be in order at the end.
 * @param keys the keys to order
 * @param keyOrder the key order from the setting
 * @param bias the bias for the key order, either "first" or "last"
 * @returns the new key order based on the bias
 */
function enforceBiasedKeyOrder(
  keys: string[],
  keyOrder: string[],
  bias: "first" | "last"
): string[] {
  const orderedKeys = keyOrder.filter((k) => keys.includes(k));
  const remainingKeys = keys.filter((k) => !orderedKeys.includes(k));
  return bias === "first"
    ? [...orderedKeys, ...remainingKeys]
    : [...remainingKeys, ...orderedKeys];
}

/**
 * Array equality helper
 */
function arraysEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}
