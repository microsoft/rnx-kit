import { parseChangesetFile } from "@changesets/parse";
import { requireConfig, result, toAgentRun } from "./common.ts";
import type {
  AgentRun,
  AssertionContext,
  ChangesetMatcher,
  GradingResult,
} from "./types.ts";

/**
 * Passes if the agent added the configured number of change files, mentioning
 * the configured packages.
 */
export function changesets(
  output: AgentRun | string,
  context: AssertionContext<ChangesetMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { count, packages } = requireConfig(context);
  const added = run.files.filter(
    (file) =>
      file.status === "added" &&
      /^\.changeset\/[^/]+\.md$/.test(file.path) &&
      file.path !== ".changeset/README.md"
  );

  const failures: string[] = [];
  if (added.length !== count) {
    failures.push(
      `Expected ${count} change file(s), found ${added.length}: ${added.map((f) => f.path).join(", ")}`
    );
  }

  const released = new Set<string>();
  for (const file of added) {
    try {
      for (const { name } of parseChangesetFile(file.content ?? "").releases) {
        released.add(name);
      }
    } catch (e) {
      failures.push(`${file.path}: ${(e as Error).message}`);
    }
  }

  for (const pkg of packages ?? []) {
    if (!released.has(pkg)) {
      failures.push(`No change file releases ${pkg}`);
    }
  }

  return result(failures, `Found ${added.length} change file(s)`);
}
