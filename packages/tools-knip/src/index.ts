import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { KnipIssue, KnipOptions, KnipResults, IssueType } from "./types.ts";

export type { KnipIssue, KnipOptions, KnipResults, IssueType } from "./types.ts";

const DEFAULT_ENTRY = ["src/index.ts"];
const DEFAULT_TEST_FILE_PATTERNS = ["test/**/*.test.{js,mjs,ts,tsx}"];

const ISSUE_TYPE_LABELS: Record<string, string> = {
  files: "Unused files",
  dependencies: "Unused dependencies",
  devDependencies: "Unused devDependencies",
  optionalPeerDependencies: "Unused optionalPeerDependencies",
  unlisted: "Unlisted dependencies",
  binaries: "Unlisted binaries",
  unresolved: "Unresolved imports",
  exports: "Unused exports",
  types: "Unused exported types",
  nsExports: "Unused exports in namespace",
  nsTypes: "Unused exported types in namespace",
  duplicates: "Duplicate exports",
  enumMembers: "Unused enum members",
  classMembers: "Unused class members",
};

/**
 * Build a knip JSON config object from the provided options.
 */
export function buildConfig(options: KnipOptions): Record<string, unknown> {
  const entry = [
    ...(options.entry ?? DEFAULT_ENTRY),
    ...(options.testFilePatterns ?? DEFAULT_TEST_FILE_PATTERNS),
    ...(options.configFiles ?? []),
  ];

  const config: Record<string, unknown> = { entry };

  if (options.project && options.project.length > 0) {
    config.project = options.project;
  }

  if (options.ignoreDependencies && options.ignoreDependencies.length > 0) {
    config.ignoreDependencies = options.ignoreDependencies.map((d) =>
      d instanceof RegExp ? d.source : d
    );
  }

  if (options.ignoreBinaries && options.ignoreBinaries.length > 0) {
    config.ignoreBinaries = options.ignoreBinaries;
  }

  return config;
}

/**
 * Transform knip's raw issues into a flat KnipResults structure.
 */
export function formatResults(
  issues: Record<string, unknown>,
  counters: Record<string, number>
): KnipResults {
  const result: KnipResults = {
    files: [],
    issues: {},
    counters: { ...counters },
  };

  // Handle the "files" issue set (it's a Set<string>, not IssueRecords)
  const fileSet = issues.files;
  if (fileSet && fileSet instanceof Set) {
    result.files = [...fileSet];
  }

  // Handle all other issue types (IssueRecords: Record<filePath, Record<symbol, Issue>>)
  const issueTypes: IssueType[] = [
    "dependencies",
    "devDependencies",
    "optionalPeerDependencies",
    "unlisted",
    "binaries",
    "unresolved",
    "exports",
    "types",
    "nsExports",
    "nsTypes",
    "duplicates",
    "enumMembers",
    "classMembers",
  ];

  for (const issueType of issueTypes) {
    const records = issues[issueType] as
      | Record<string, Record<string, { filePath: string; symbol: string; line?: number; col?: number; severity?: string }>>
      | undefined;
    if (!records) continue;

    const flatIssues: KnipIssue[] = [];
    for (const [filePath, symbols] of Object.entries(records)) {
      for (const issue of Object.values(symbols)) {
        flatIssues.push({
          filePath: issue.filePath ?? filePath,
          symbol: issue.symbol,
          line: issue.line,
          col: issue.col,
          type: issueType,
          severity: issue.severity as KnipIssue["severity"],
        });
      }
    }

    if (flatIssues.length > 0) {
      result.issues[issueType] = flatIssues;
    }
  }

  return result;
}

/**
 * Print results to stderr in a human-readable format.
 */
export function printResults(results: KnipResults): void {
  let hasOutput = false;

  if (results.files.length > 0) {
    hasOutput = true;
    console.error(`\n${ISSUE_TYPE_LABELS.files} (${results.files.length})`);
    for (const file of results.files) {
      console.error(`  ${file}`);
    }
  }

  for (const [type, issues] of Object.entries(results.issues)) {
    if (!issues || issues.length === 0) continue;
    hasOutput = true;
    const label = ISSUE_TYPE_LABELS[type] ?? type;
    console.error(`\n${label} (${issues.length})`);
    for (const issue of issues) {
      const location = issue.line ? `:${issue.line}${issue.col ? `:${issue.col}` : ""}` : "";
      console.error(`  ${issue.filePath}${location}  ${issue.symbol}`);
    }
  }

  if (!hasOutput) {
    console.error("\nNo issues found.");
  }
}

/**
 * Run knip analysis on a package.
 *
 * @param options - Configuration options for the knip run
 * @returns Structured results from the analysis
 */
export async function runKnip(options: KnipOptions = {}): Promise<KnipResults> {
  const cwd = options.cwd ?? process.cwd();
  const mode = options.mode ?? "structured";
  const config = buildConfig(options);

  // Write config to a temp file
  const tempDir = os.tmpdir();
  const tempConfigPath = path.join(tempDir, `knip-config-${Date.now()}.json`);

  try {
    fs.writeFileSync(tempConfigPath, JSON.stringify(config), "utf-8");

    // Build args for createOptions
    const args: Record<string, unknown> = {
      config: tempConfigPath,
      "no-progress": true,
      "no-config-hints": true,
    };

    if (options.include && options.include.length > 0) {
      args.include = options.include;
    }

    if (options.exclude && options.exclude.length > 0) {
      args.exclude = options.exclude;
    }

    const { createOptions } = await import("knip/session");
    const knipOptions = await createOptions({ cwd, args });

    // knip's "." export maps types to dist/types.d.ts (config types only),
    // but the runtime default export (dist/index.js) does export `main`.
    // Use the session module's createOptions for typed config, then call
    // main via the runtime module.
    const knip = (await import("knip")) as unknown as {
      main: (options: typeof knipOptions) => Promise<{
        issues: Record<string, unknown>;
        counters: Record<string, number>;
      }>;
    };
    const { issues, counters } = await knip.main(knipOptions);

    const results = formatResults(issues, counters);

    if (mode === "console") {
      printResults(results);
    }

    return results;
  } finally {
    try {
      fs.unlinkSync(tempConfigPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
