import { VALID_MATCH_KEY, WILDCARD_KEY } from "./const.ts";
import type {
  EntryPath,
  EntryPathSegment,
  FinalizerEntryType,
  JSONValueType,
  ResolvedFinalizerOptions,
  ResolvedPaths,
} from "./types.ts";

export function wildcard(path: string): EntryPathSegment[];
export function wildcard(path: undefined): EntryPathSegment;
export function wildcard(path?: string): EntryPathSegment | EntryPathSegment[] {
  if (path === undefined) {
    return WILDCARD_KEY;
  } else {
    const parts = path.split(".");
    return parts.map((part) => (part === "*" ? WILDCARD_KEY : part));
  }
}

/**
 * Resolve an entry path into an array of strings. A single string will be split on '.' to support nested fields. This is much
 * easier to specify but explicit paths can be provided to allow for fields with '.' in the name.
 *
 * A null value will be treated as an empty path, matching the root of the JSON file.
 * @param path input path to resolve
 * @returns the resolved entry path, either a string array or null for the root path
 */
export function resolveEntryPaths(
  path: EntryPath | EntryPath[]
): ResolvedPaths {
  const paths = Array.isArray(path) ? path : [path];
  const resolved: ResolvedPaths = {};
  for (const p of paths) {
    if (p === null) {
      resolved[VALID_MATCH_KEY] = true;
    } else {
      const parts: string[] = typeof p === "string" ? p.split(".") : p;
      let current: ResolvedPaths = resolved;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // for the last iteration in this path, we should mark this entry as true
          if (typeof current[part] === "object") {
            current[part][VALID_MATCH_KEY] = true;
          } else {
            current[part] = true;
          }
        } else {
          if (!current[part] || typeof current[part] === "boolean") {
            current[part] = current[part] ? { [VALID_MATCH_KEY]: true } : {};
          }
          current = current[part] as ResolvedPaths;
        }
      }
    }
  }
  return resolved;
}

export function getScopePrecedence(
  config: Pick<ResolvedFinalizerOptions, "entryPaths" | "entryType">,
  valueType: FinalizerEntryType,
  valuePath: string[] | null
): number {
  const { entryPaths, entryType } = config;
}

/**
 * A reference to a field of a json file. A single string will be split on '.' to support nested fields, arrays of strings
 * will be treated as is, allowing for paths that may have '.' in them.
 * For example, the path 'compilerOptions.types' will reference the 'types' field within the 'compilerOptions' object of a tsconfig.json file.
 *
 * Simple wildcards are supported, with '*' matching any field at a single level. '**' will not be supported because there is too much
 * risk of unintended consequences when used in a complex json file.
 *
 * A null value will be treated as an empty path, matching the root of the JSON file.
 */

export function normalizeJsonEntryPath(path: JsonEntryPath): string[] | null {
  if (typeof path === "string") {
    return path.split(".");
  }
  return path;
}

export type Scope = {
  /**
   * Match based on value type, if not specified it will match any type.
   */
  type?: JSONValueType | JSONValueType[];

  /**
   * Match based on one or more entry paths, as specified by JsonEntryPath above. If not specified it will match any path.
   */
  paths?: JsonEntryPath[];
};

const isValid = Symbol("valid");

type ResolvedScopeMap = {
  [isValid]: boolean;
  [key: string]: ResolvedScopeMap | boolean;
};

export function inScope(
  scopeMap: ResolvedScopeMap,
  path: string[] | null
): boolean {
  if (path === null) {
    return scopeMap[isValid] === true;
  } else {
    let currentMap: ResolvedScopeMap | boolean = scopeMap;
    for (const segment of path) {
    }
  }
}
