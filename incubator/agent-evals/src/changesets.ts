import { parseChangesetFile } from "@changesets/parse";
import * as path from "node:path";
import { requireConfig, result, toAgentRun } from "./common.ts";
import type {
  AgentRun,
  AssertionContext,
  ChangesetMatcher,
  GradingResult,
} from "./types.ts";

/**
 * Passes if the agent added the configured number of change files, or at
 * least that many if `atLeast` is set, releasing the configured packages and
 * none of the forbidden ones.
 */
export function changesets(
  output: AgentRun | string,
  context: AssertionContext<ChangesetMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { count, atLeast, packages, forbidden } = requireConfig(context);
  const added = run.files.filter((file) => {
    if (file.status !== "added" || !file.path.endsWith(".md")) {
      return false;
    }

    const parentDir = path.win32.basename(path.win32.dirname(file.path));
    const filename = path.win32.basename(file.path);
    return parentDir === ".changeset" && filename !== "README.md";
  });

  const failures: string[] = [];
  if (atLeast ? added.length < count : added.length !== count) {
    failures.push(
      `Expected ${atLeast ? "at least " : ""}${count} change file(s), found ${added.length}: ${added.map((f) => f.path).join(", ")}`
    );
  }

  const released = new Set<string>();
  for (const file of added) {
    try {
      for (const { name } of parseChangesetFile(file.content ?? "").releases) {
        released.add(name);
      }
    } catch (e) {
      failures.push(`${file.path}: ${Error.isError(e) ? e.message : e}`);
    }
  }

  for (const pkg of packages ?? []) {
    if (!released.has(pkg)) {
      failures.push(`No change file releases ${pkg}`);
    }
  }

  for (const pkg of forbidden ?? []) {
    if (released.has(pkg)) {
      failures.push(`A change file releases ${pkg}`);
    }
  }

  return result(failures, `Found ${added.length} change file(s)`);
}
