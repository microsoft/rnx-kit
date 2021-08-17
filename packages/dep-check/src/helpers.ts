export function concatVersionRanges(versions: string[]): string {
  return "^" + versions.join(" || ^");
}

export function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}
