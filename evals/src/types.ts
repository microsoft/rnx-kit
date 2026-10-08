/**
 * A shell command executed by the agent.
 */
export type AgentCommand = {
  /** The command line as typed by the agent, e.g. `yarn build` */
  command: string;
  /** Working directory relative to the repository root; `.` for the root */
  cwd: string;
};

/**
 * A tool (other than shell) invoked by the agent, e.g. an MCP tool.
 */
export type AgentToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

/**
 * A file changed by the agent, relative to the base commit.
 */
export type AgentChangedFile = {
  /** Path relative to the repository root, using forward slashes */
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  /** Content after the run; omitted for deleted files */
  content?: string;
};

/**
 * Output of a single agent run, as returned by the harness to promptfoo.
 */
export type AgentRun = {
  commands: AgentCommand[];
  toolCalls: AgentToolCall[];
  files: AgentChangedFile[];
  /** Unified diff (`git diff <base>`) of all changes, including untracked files */
  diff: string;
  /** The agent's final message to the user */
  finalMessage: string;
};

/**
 * Configuration for `ranCommand` and `didNotRunCommand`.
 */
export type CommandMatcher = {
  /** Regular expression the command must match */
  pattern: string;
  /** Regular expression the working directory must match */
  cwd?: string;
};

/**
 * Configuration for `matchesFiles`.
 */
export type FilesMatcher = {
  /** Every matching file must also match at least one of these */
  allowed?: string[];
  /** No matching file may match any of these */
  forbidden?: string[];
  /** At least one matching file must match each of these */
  required?: string[];
  /** Only consider files with these statuses; defaults to all */
  status?: AgentChangedFile["status"][];
};

/**
 * Configuration for `matchesContent`.
 */
export type ContentMatcher = {
  /** Regular expression matching the paths of the files to check */
  files: string;
  /** Every matching file must match each of these */
  required?: string[];
  /** No matching file may match any of these */
  forbidden?: string[];
  /** Only check lines added in the diff instead of the full content */
  addedLinesOnly?: boolean;
};

/**
 * Configuration for `passesLint`.
 */
export type LintMatcher = {
  /** Regular expression matching the paths of the files to lint */
  files: string;
  /** ESLint rules to apply; `@rnx-kit/*` rules are available */
  rules: Record<string, unknown>;
  /** Only report problems on lines added in the diff */
  addedLinesOnly?: boolean;
};

/**
 * Configuration for `changesets`.
 */
export type ChangesetMatcher = {
  /** Exact number of added change files */
  count: number;
  /** Packages that must be mentioned in the added change files */
  packages?: string[];
};

/**
 * Configuration for `noToolCall`.
 */
export type ToolCallMatcher = {
  /** Regular expression matching tool names */
  name: string;
  /** Only match calls whose serialized arguments match this */
  arguments?: string;
};

/**
 * Subset of promptfoo's `AssertionValueFunctionContext` used by assertions.
 */
export type AssertionContext<T> = {
  config?: T;
};

/**
 * Subset of promptfoo's `GradingResult` returned by assertions.
 */
export type GradingResult = {
  pass: boolean;
  score: number;
  reason: string;
};
