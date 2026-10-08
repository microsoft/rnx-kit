/**
 * Returns the line numbers added to each file in a unified diff.
 * @param diff Unified diff, e.g. the output of `git diff`
 * @returns Map of file path to the 1-based line numbers in the new file
 */
export function addedLines(diff: string): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();

  let current: Set<number> | undefined;
  let lineNumber = 0;
  let oldRemaining = 0;
  let newRemaining = 0;

  for (const line of diff.split("\n")) {
    if (oldRemaining > 0 || newRemaining > 0) {
      if (line.startsWith("+")) {
        current?.add(lineNumber++);
        --newRemaining;
      } else if (line.startsWith("-")) {
        --oldRemaining;
      } else if (line.startsWith(" ") || line === "") {
        ++lineNumber;
        --oldRemaining;
        --newRemaining;
      }
      continue;
    }

    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      current = target === "/dev/null" ? undefined : new Set();
      if (current) {
        result.set(target.replace(/^b\//, ""), current);
      }
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      oldRemaining = Number(hunk[1] ?? 1);
      lineNumber = Number(hunk[2]);
      newRemaining = Number(hunk[3] ?? 1);
    }
  }

  return result;
}
