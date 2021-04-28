#!/usr/bin/env node
import fs from "fs";
import { diff } from "./diff";

export function withSign(n: number): string {
  if (Number.isNaN(n)) {
    return "unknown";
  }

  if (n === 0) {
    return "±0";
  }

  return n > 0 ? `+${n}` : n.toString();
}

export function numDigits(n: number): number {
  if (Number.isNaN(n)) {
    return withSign(n).length;
  }

  if (n === 0) {
    return 1;
  }

  return Math.floor(Math.log10(Math.abs(n)) + 1);
}

export function numDigitsStringLength(content: string | null): number {
  return numDigits(content?.length ?? NaN);
}

export function cli(aSourceMap: string, bSourceMap: string): void {
  const a = JSON.parse(fs.readFileSync(aSourceMap, { encoding: "utf-8" }));
  const b = JSON.parse(fs.readFileSync(bSourceMap, { encoding: "utf-8" }));

  const digits = Math.max(
    ...a.sourcesContent.map(numDigitsStringLength),
    ...b.sourcesContent.map(numDigitsStringLength)
  );

  const output = diff(a, b)
    .sort((a, b) => b.diff - a.diff)
    .map(({ diff, path, state }) => {
      const contentSize = withSign(diff).padStart(digits + 1);
      const sourceState = state.padStart(7);
      return ` ${contentSize}  ${sourceState}  ${path}`;
    })
    .join("\n");

  if (output) {
    console.log(output);
  }
}

if (require.main === module) {
  const { [2]: aSourceMap, [3]: bSourceMap } = process.argv;
  cli(aSourceMap, bSourceMap);
}
