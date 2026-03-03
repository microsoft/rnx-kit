// The valid JSON value types
export const JSON_VALUE_TYPES = [
  "string",
  "number",
  "boolean",
  "null",
  "object",
  "array",
] as const;

// precedence constants for scope matching
export const TYPE_UNSPECIFIED_MATCH_PRECEDENCE = 1;
export const TYPE_MATCH_PRECEDENCE = 2;
export const PATH_WILDCARD_MATCH_PRECEDENCE = 3;
export const PATH_EXACT_MATCH_PRECEDENCE = 4;

// key for marking an entry as a valid path match
export const VALID_MATCH_KEY = Symbol("validMatch");
// key for handling wildcards in resolved paths
export const WILDCARD_KEY = Symbol("*");
