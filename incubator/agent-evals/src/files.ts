import {
  addedLines,
  existingFiles,
  requireConfig,
  result,
  selectLines,
  toAgentRun,
} from "./common.ts";
import type {
  AgentRun,
  AssertionContext,
  ContentMatcher,
  GradingResult,
} from "./types.ts";

/**
 * Passes if no matching file contains any of the `forbidden` patterns. Fails
 * if no files match, unless `optional` is set.
 */
export function matchesContent(
  output: AgentRun | string,
  context: AssertionContext<ContentMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, forbidden, addedLinesOnly, optional } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const matching = existingFiles(run).filter((file) =>
    pathPattern.test(file.path)
  );
  if (matching.length === 0) {
    return optional
      ? result([], `Not applicable: no changed file matched /${files}/`)
      : result([`No changed file matched /${files}/`], "");
  }

  const added = addedLinesOnly ? addedLines(run.diff) : undefined;
  const failures: string[] = [];
  const contents = matching.map((file) => selectLines(file, added));
  for (const pattern of forbidden ?? []) {
    const re = new RegExp(pattern, "m");
    for (const [i, file] of matching.entries()) {
      if (re.test(contents[i])) {
        failures.push(`${file.path}: contains /${pattern}/`);
      }
    }
  }

  return result(
    failures,
    `Checked ${matching.map((file) => file.path).join(", ")}`
  );
}
