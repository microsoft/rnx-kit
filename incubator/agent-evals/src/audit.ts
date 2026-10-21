import * as path from "node:path";
import { changesets } from "./changesets.ts";
import { ranCommand } from "./commands.ts";
import { result, toAgentRun, tryReadJSON } from "./common.ts";
import type { AgentRun, GradingResult } from "./types.ts";
import { owningPackageDir, workspacePackages } from "./workspace.ts";

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

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
      atLeast: published.length > 0,
      packages: published,
      forbidden: privatePackages,
    },
  });
}

/**
 * Passes if, for every package with changed source files, the agent ran each
 * of `config.scripts` (default: `format`, `lint` and `test`) that the package
 * defines with `yarn <script>`, in the package or at the repository root.
 */
export function ranChecksForChanges(
  output: AgentRun | string,
  context?: { config?: { scripts?: string[] } }
): GradingResult {
  const run = toAgentRun(output);
  const checks = context?.config?.scripts ?? ["format", "lint", "test"];
  const results: GradingResult[] = [];
  const packages = changedPackages(
    run,
    (file) => file.status !== "deleted" && SOURCE_FILE.test(file.path)
  );
  for (const { dir, manifest } of packages) {
    const cwd = `^(\\.|${escapeRegExp(dir)})$`;
    const scripts = checks.filter((script) => manifest.scripts?.[script]);
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
