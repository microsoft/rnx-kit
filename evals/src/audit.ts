import {
  changedPackages,
  changesets,
  ranCommand,
  result,
  toAgentRun,
  tryReadJSON,
  workspacePackages,
} from "@rnx-kit/agent-evals";
import type { AgentRun, GradingResult } from "@rnx-kit/agent-evals";
import * as path from "node:path";
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

/**
 * Passes if the agent added change files releasing all published packages it
 * changed, and none if it did not change any. No change file may release a
 * private package.
 *
 * Note: Changes that do not affect the published package, e.g. to tests or
 * docs, do not need a change file, but Changesets does not tell them apart.
 */
export function changesetsMatchChanges(
  output: AgentRun | string
): GradingResult {
  const run = toAgentRun(output);
  const isChangeset = (file: { path: string }) =>
    file.path.startsWith(".changeset/");
  const published = changedPackages(run, (file) => !isChangeset(file))
    .filter(({ manifest }) => !manifest.private)
    .map(({ name }) => name);
  const privatePackages: string[] = [];
  for (const [name, dir] of workspacePackages(run.workdir)) {
    if (tryReadJSON(path.join(run.workdir, dir, "package.json"))?.private) {
      privatePackages.push(name);
    }
  }
  return changesets(run, {
    config: {
      count: published.length > 0 ? 1 : 0,
      atLeast: published.length > 0,
      packages: published,
      forbidden: privatePackages,
    },
  });
}
