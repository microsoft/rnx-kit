export function concatVersionRanges(versions: string[]): string {
  return "^" + versions.join(" || ^");
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}
