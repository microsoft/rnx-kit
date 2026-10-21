import {
  ranCommand,
  result,
  toAgentRun,
  workspacePackages,
} from "@rnx-kit/agent-evals";
import type { AgentRun, GradingResult } from "@rnx-kit/agent-evals";
import parseDiff from "parse-diff";

const DEPENDENCY_LINE = /^[+-]\s*"[^"]+":\s*"([\^~]?\d|[a-z]+:)/;

/**
 * Passes if the agent created new workspace packages with `yarn new-package`.
 */
export function newPackagesScaffolded(
  output: AgentRun | string
): GradingResult {
  const run = toAgentRun(output);
  const added = Array.from(workspacePackages(run.workdir).values()).filter(
    (dir) =>
      run.files.some(
        (file) => file.status === "added" && file.path === `${dir}/package.json`
      )
  );
  if (added.length === 0) {
    return result([], "Not applicable: no packages were added");
  }

  const check = ranCommand(run, {
    config: { pattern: "^yarn new-package\\b" },
  });
  return check.pass
    ? check
    : result([`Added ${added.join(", ")} without 'yarn new-package'`], "");
}

/**
 * Passes if dependency changes in `docsite/package.json` are installed in
 * `docsite/yarn.lock`, which is separate from the root lockfile.
 */
export function docsiteDependencies(output: AgentRun | string): GradingResult {
  const run = toAgentRun(output);
  const manifest = parseDiff(run.diff).find(
    (file) => file.to === "docsite/package.json"
  );
  const changed = manifest?.chunks.some((chunk) =>
    chunk.changes.some(
      (change) =>
        change.type !== "normal" && DEPENDENCY_LINE.test(change.content)
    )
  );
  if (!changed) {
    return result(
      [],
      "Not applicable: no dependencies changed in docsite/package.json"
    );
  }
  return run.files.some((file) => file.path === "docsite/yarn.lock")
    ? result([], "docsite/yarn.lock changed")
    : result(["Changed dependencies without updating docsite/yarn.lock"], "");
}
