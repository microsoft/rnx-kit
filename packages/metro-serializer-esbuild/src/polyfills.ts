import { v } from "./version";

function isHermes(target: string | string[]): boolean {
  const isHermes = (t: string) => t.startsWith("hermes");
  return Array.isArray(target) ? target.some(isHermes) : isHermes(target);
}

export function polyfillAsyncIteratorSymbol(
  esbuild: { version: string },
  target: string | string[]
): string {
  // No longer needed in 0.19.6:
  // https://github.com/evanw/esbuild/releases/tag/v0.19.6
  const isNeeded = v(esbuild.version) < v("0.19.6");
  return isNeeded && isHermes(target)
    ? `if (!Symbol.asyncIterator) { Symbol.asyncIterator = Symbol.for("Symbol.asyncIterator"); }`
    : "";
}
