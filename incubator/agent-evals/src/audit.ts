import * as path from "node:path";
import { ranCommand } from "./commands.ts";
import { result, toAgentRun, tryReadJSON } from "./common.ts";
import type { AgentRun, GradingResult } from "./types.ts";
import { owningPackageDir, workspacePackages } from "./workspace.ts";

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

export type ChangedPackage = {
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
export function changedPackages(
  run: AgentRun,
  filter: (file: AgentRun["files"][number]) => boolean = () => true
): ChangedPackage[] {
  const packages = workspacePackages(run.workdir);
  const names = new Map(Array.from(packages).map(([name, dir]) => [dir, name]));
  const dirs = new Set(
    run.files
      .filter(filter)
      .map((file) => owningPackageDir(names.keys(), file.path))
      .filter((dir) => dir !== ".")
  );
  return Array.from(dirs)
    .sort()
    .map((dir) => ({
      name: names.get(dir) ?? dir,
      dir,
      manifest: tryReadJSON(path.join(run.workdir, dir, "package.json")) ?? {},
    }));
}

function combine(
  results: GradingResult[],
  notApplicable: string
): GradingResult {
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
    if (scripts.length === 0) {
      results.push(result([], `${dir} defines none of: ${checks.join(", ")}`));
      continue;
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
