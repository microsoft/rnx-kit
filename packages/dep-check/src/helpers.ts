export function concatVersionRanges(versions: string[]): string {
  return "^" + versions.join(" || ^");
}

export function hasMessage(err: unknown): err is { message: string } {
  return typeof err === "object" && err !== null && "message" in err;
}

export function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}
