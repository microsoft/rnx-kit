import type {
  JSON_VALUE_TYPES,
  VALID_MATCH_KEY,
  WILDCARD_KEY,
} from "./const.ts";

export type JSONValueType = (typeof JSON_VALUE_TYPES)[number];

export type JSONRecordBase = Record<string, unknown>;
export type JSONPrimitive = string | number | boolean | null;

export type JSONValue = JSONPrimitive | JSONRecordBase | JSONValue[];

export type JSONObject = Record<string, JSONValue>;

export type EntryPathSegment = string | symbol;
export type EntryPath = EntryPathSegment | EntryPathSegment[] | null;

export type FinalizerEntryType = Extract<JSONValueType, "object" | "array">;
export type FinalizerLevel = "warn" | "error" | "off";

export type FinalizerOptions = {
  /**
   * Match based on value type, if not specified it will match either type (object or array).
   */
  entryType?: FinalizerEntryType;

  /**
   * Match based on one or more entry paths, as specified by JsonEntryPath above. If not specified it will match any path.
   */
  entryPaths?: EntryPath[];

  /**
   * Override message for this finalizer
   */
  message?: string;
};

export type ResolvedPaths = {
  [VALID_MATCH_KEY]?: boolean;
  [WILDCARD_KEY]?: ResolvedPaths | boolean;
  [key: string]: ResolvedPaths | boolean;
};

export type ResolvedFinalizerOptions<
  TOptions extends FinalizerOptions = FinalizerOptions,
> = Omit<TOptions, "entryPaths"> & {
  entryPaths?: ResolvedPaths;
};

export type FinalizerConfig<
  TOptions extends FinalizerOptions = FinalizerOptions,
> = FinalizerLevel | [FinalizerLevel, TOptions] | [TOptions];

export type FinalizerSettings<
  TOptions extends FinalizerOptions = FinalizerOptions,
> = ResolvedFinalizerOptions<TOptions> & {
  level: FinalizerLevel;
};

/**
 * Finalization reporting context, provided to finalizers to report issues during finalization. The finalizer should look for issues
 * without modifying the input value, and if any are found report them using this context.
 *
 * In check mode, the context will use the message and the error level from the finalizer to report the issue without calling the fixer
 * function. It will return the original value as is.
 *
 * In fix mode, the fixer function will be called to get the modified value, and the context will report that a change has been made. If
 * no fixer function is provided the context will act as in check mode, reporting the issue with the specified error level.
 */
export type ReportOrFix = <T>(message: string | string[], fixer?: () => T) => T;

export type FinalizerContext<TVal extends object> = {
  /**
   * The value being finalized
   */
  target: TVal;

  /**
   * Type and path information for the entry being finalized
   */
  targetData: {
    type: FinalizerEntryType;
    path: string[] | null;
  };

  /**
   * Used to report an issue found during finalization, and optionally provide a fixer function to modify the input value.
   * The finalizer should look for issues without modifying the input value, and if any are found report them using this function.
   *
   * In check mode, the context will use the message and the error level from the finalizer to report the issue without calling the fixer
   * function. It will return the original value as is.
   *
   * In fix mode, the fixer function will be called to get the modified value, and the context will report that a change has been made. If
   * no fixer function is provided the context will act as in check mode, reporting the issue with the specified error level.
   */
  report: <T>(message: string | string[], fixer?: () => T) => T;

  /**
   * Mode the finalizer is being run in, either "check" or "fix".
   */
  mode: "check" | "fix";
};

/**
 * A finalizer is a function that can be applied to a JSON record or array during finalization, based on the type and path of the entry being finalized.
 * Finalizers can be used to enforce certain formatting rules, such as ordering entries alphabetically, or to remove empty entries from the final output.
 *
 * Process finalizers that apply will be run in precedence order, from lowest to highest, each receiving the value from the previous finalizer. If the value
 * of the record or array becomes undefined the process will be aborted and the entry will be deleted from the final output.
 *
 * If an order finalizer applies, the highest precedence order finalizer will be run at the end of the process if the value has not been deleted.
 */
export type Finalizer = {
  /**
   * The type of finalization to perform.
   *
   * "process" finalizers will do some sort of transformation on the input values such as removing empty entries.
   * - multiple "process" finalizers can be applied to the same record or array, they will be executed in order of precedence.
   *
   * "order" finalizers will reorder the entries of a record or array.
   * - only one "order" finalizer will be applied to each entry, the one with the highest precedence will be chosen.
   */
  type: "process" | "order";

  /**
   * The process function for the finalizer. Will potentially modify the input values and return the modified values.
   * @param context The finalization context for the finalizer to report any issues found during finalization, and optionally provide a fixer function to modify the input value.
   * @returns The processed value or undefined if it should be deleted.
   */
  process: <T extends object>(context: FinalizerContext<T>) => T | undefined;

  /**
   * Check whether this finalizer should be applied, and if so return a precedence number to determine the order of application of multiple finalizers.
   * A higher precedence number means the finalizer will be applied later, and will take priority over other finalizers of the same type.
   * @param entryType the type of the entry being finalized, either "object" or "array".
   * @param entryPath the path of the entry being finalized, represented as an array of strings for each level of nesting, or null for the root entry.
   * @returns a precedence number if the finalizer should be applied to this entry, or a falsy value if it should not be applied.
   */
  precedence: (
    entryType: Extract<"object" | "array", JSONValueType>,
    entryPath: string[] | null
  ) => number | undefined;
};
