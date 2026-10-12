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
  FilesMatcher,
  GradingResult,
} from "./types.ts";
import { owningPackageDir, workspacePackages } from "./workspace.ts";

/**
 * Passes if the changed files satisfy the configured constraints.
 */
export function matchesFiles(
  output: AgentRun | string,
  context: AssertionContext<FilesMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { allowed, forbidden, required, status, singlePackage } =
    requireConfig(context);
  const files = run.files
    .filter((file) => !status || status.includes(file.status))
    .map((file) => file.path);

  const failures: string[] = [];

  if (singlePackage) {
    const dirs = [...workspacePackages(run.workdir).values()];
    const touched = new Set(
      files
        .map((file) => owningPackageDir(dirs, file))
        .filter((dir) => dir !== ".")
    );
    if (touched.size > 1) {
      failures.push(`Changed multiple packages: ${[...touched].join(", ")}`);
    }
  }

  if (allowed) {
    const patterns = allowed.map((p) => new RegExp(p));
    for (const file of files) {
      if (!patterns.some((p) => p.test(file))) {
        failures.push(`File not allowed: ${file}`);
      }
    }
  }

  for (const pattern of forbidden ?? []) {
    const re = new RegExp(pattern);
    for (const file of files) {
      if (re.test(file)) {
        failures.push(`File forbidden by /${pattern}/: ${file}`);
      }
    }
  }

  for (const pattern of required ?? []) {
    const re = new RegExp(pattern);
    if (!files.some((file) => re.test(file))) {
      failures.push(`No file matched /${pattern}/`);
    }
  }

  return result(failures, `Changed files: ${files.join(", ") || "(none)"}`);
}

/**
 * Passes if the content of the matching files satisfies the configured
 * patterns. Fails if no files match.
 */
export function matchesContent(
  output: AgentRun | string,
  context: AssertionContext<ContentMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, required, match, forbidden, addedLinesOnly } =
    requireConfig(context);
  const pathPattern = new RegExp(files);
  const matching = existingFiles(run).filter((file) =>
    pathPattern.test(file.path)
  );
  if (matching.length === 0) {
    return result([`No changed file matched /${files}/`], "");
  }

  const added = addedLinesOnly ? addedLines(run.diff) : undefined;
  const failures: string[] = [];
  const contents = matching.map((file) => selectLines(file, added));
  for (const pattern of required ?? []) {
    const re = new RegExp(pattern, "m");
    const missing = matching.filter((_, i) => !re.test(contents[i]));
    if (match === "any") {
      if (missing.length === matching.length) {
        failures.push(`No matching file contains /${pattern}/`);
      }
    } else {
      for (const file of missing) {
        failures.push(`${file.path}: missing /${pattern}/`);
      }
    }
  }
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
