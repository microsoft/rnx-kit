/**
 * Issue category types matching knip's internal classification.
 */
export type IssueType =
  | "files"
  | "dependencies"
  | "devDependencies"
  | "optionalPeerDependencies"
  | "unlisted"
  | "binaries"
  | "unresolved"
  | "exports"
  | "types"
  | "nsExports"
  | "nsTypes"
  | "duplicates"
  | "enumMembers"
  | "classMembers";

export interface KnipOptions {
  /** Working directory of the package to analyze (default: process.cwd()) */
  cwd?: string;
  /** Entry point files (default: ["src/index.ts"]) */
  entry?: string[];
  /** Test file glob patterns (default: ["test\/**\/*.test.{js,mjs,ts,tsx}"]) */
  testFilePatterns?: string[];
  /** Additional project file patterns to include */
  project?: string[];
  /** Config files to treat as entry points (e.g., ["jest.config.js", "babel.config.js"]) */
  configFiles?: string[];
  /** Dependencies to ignore */
  ignoreDependencies?: (string | RegExp)[];
  /** Binaries to ignore */
  ignoreBinaries?: string[];
  /** Issue types to include (default: all) */
  include?: IssueType[];
  /** Issue types to exclude */
  exclude?: IssueType[];
  /** Output mode: "console" prints human-readable output, "structured" returns data only */
  mode?: "console" | "structured";
}

export interface KnipIssue {
  /** The file path where the issue was found */
  filePath: string;
  /** The symbol name (for export/type/member issues) or dependency name */
  symbol: string;
  /** Line number in the file, if available */
  line?: number;
  /** Column number in the file, if available */
  col?: number;
  /** The issue category */
  type: IssueType;
  /** Severity level */
  severity?: "error" | "warn" | "off";
}

export interface KnipResults {
  /** Unused files */
  files: string[];
  /** Issues grouped by category */
  issues: Partial<Record<IssueType, KnipIssue[]>>;
  /** Count of issues per category */
  counters: Partial<Record<IssueType | "processed" | "total", number>>;
}
