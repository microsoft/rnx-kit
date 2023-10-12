function isHermes(target: string | string[]): boolean {
  const isHermes = (t: string) => t.startsWith("hermes");
  return Array.isArray(target) ? target.some(isHermes) : isHermes(target);
}

export function polyfillAsyncIteratorSymbol(target: string | string[]): string {
  return isHermes(target)
    ? `if (!Symbol.asyncIterator) { Symbol.asyncIterator = Symbol.for("Symbol.asyncIterator"); }`
    : "";
}
