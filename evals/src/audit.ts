import * as path from "node:path";
import parseDiff from "parse-diff";
import { changesets } from "./changesets.ts";
import { ranCommand } from "./commands.ts";
import { result, toAgentRun, tryReadJSON } from "./common.ts";
import type { AgentRun, GradingResult } from "./types.ts";
import { owningPackageDir, workspacePackages } from "./workspace.ts";

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

const DEPENDENCY_LINE = /^[+-]\s*"[^"]+":\s*"([\^~]?\d|[a-z]+:)/;

type ChangedPackage = {
  name: string;
  dir: string;
  manifest: { private?: boolean; scripts?: Record<string, string> };
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the workspace packages containing the changed files that match
 * `filter`, in order of their directories.
 */
function changedPackages(
  run: AgentRun,
  filter: (file: AgentRun["files"][number]) => boolean = () => true
): ChangedPackage[] {
  const packages = workspacePackages(run.workdir);
  const names = new Map([...packages].map(([name, dir]) => [dir, name]));
  const dirs = new Set(
    run.files
      .filter(filter)
      .map((file) => owningPackageDir(names.keys(), file.path))
      .filter((dir) => dir !== ".")
  );
  return [...dirs].sort().map((dir) => ({
    name: names.get(dir) ?? dir,
    dir,
    manifest: tryReadJSON(path.join(run.workdir, dir, "package.json")) ?? {},
  }));
}

function combine(results: GradingResult[], notApplicable: string) {
  if (results.length === 0) {
    return result([], `Not applicable: ${notApplicable}`);
  }
  const failed = results.filter((r) => !r.pass);
  return result(
    failed.map((r) => r.reason),
    results.map((r) => r.reason).join("\n")
  );
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
      atLeast: true,
      packages: published,
      forbidden: privatePackages,
    },
  });
}

/**
 * Passes if, for every package with changed source files, the agent ran
 * `yarn format`, `yarn lint` and, if the package has tests, `yarn test` in
 * the package or at the repository root.
 */
export function ranChecksForChanges(output: AgentRun | string): GradingResult {
  const run = toAgentRun(output);
  const results: GradingResult[] = [];
  const packages = changedPackages(
    run,
    (file) => file.status !== "deleted" && SOURCE_FILE.test(file.path)
  );
  for (const { dir, manifest } of packages) {
    const cwd = `^(\\.|${escapeRegExp(dir)})$`;
    const scripts = ["format", "lint"];
    if (manifest.scripts?.["test"]) {
      scripts.push("test");
    }
    for (const script of scripts) {
      const pattern = `^yarn ${script}\\b`;
      const check = ranCommand(run, { config: { pattern, cwd } });
      results.push(
        check.pass
          ? check
          : result([`Did not run 'yarn ${script}' in ${dir}`], "")
      );
    }
  }
  return combine(results, "no source files changed in workspace packages");
}

/**
 * Passes if the agent created new workspace packages with `yarn new-package`.
 */
export function newPackagesScaffolded(
  output: AgentRun | string
): GradingResult {
  const run = toAgentRun(output);
  const added = [...workspacePackages(run.workdir).values()].filter((dir) =>
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
