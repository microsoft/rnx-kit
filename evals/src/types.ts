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
 *
 * promptfoo: the value of `ProviderResponse.output`, which promptfoo types as
 * `any` and passes unchanged to `javascript` assertions.
 */
export type AgentRun = {
  commands: AgentCommand[];
  toolCalls: AgentToolCall[];
  files: AgentChangedFile[];
  /** Unified diff (`git diff <base>`) of all changes, including untracked files */
  diff: string;
  /** The agent's final message to the user */
  finalMessage: string;
  /** Absolute path to the agent's checkout, kept until assertions finish */
  workdir: string;
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
 * Configuration for `commandSucceeds`.
 */
export type SuccessfulCommand = {
  /** Executable and arguments, e.g. `["yarn", "lint"]` */
  command: string[];
  /** Working directory relative to the repository root; defaults to `.` */
  cwd?: string;
};

/**
 * Configuration for `noInlineTypeSpecifiers`.
 */
export type TypeSpecifierMatcher = {
  /** Regular expression matching the paths of the files to check */
  files: string;
  /** Only report specifiers on lines added in the diff */
  addedLinesOnly?: boolean;
};

/**
 * Configuration for `changesets`.
 */
export type ChangesetMatcher = {
  /** Exact number of added change files */
  count: number;
  /** Packages that must be released by the added change files */
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
 *
 * promptfoo: `AssertionValueFunctionContext` (`config` is typed as
 * `Record<string, any>`).
 * @see https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
 */
export type AssertionContext<T> = {
  config?: T;
};

/**
 * Subset of promptfoo's `GradingResult` returned by assertions.
 *
 * promptfoo: `GradingResult` (`pass`, `score` and `reason` are its only
 * required fields).
 * @see https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/
 */
export type GradingResult = {
  pass: boolean;
  score: number;
  reason: string;
};

/**
 * Mocked GitHub state exposed to the agent through the harness. Read calls
 * return this data; write calls are recorded in `AgentRun.toolCalls` and are
 * never sent to GitHub.
 */
export type GitHubFixture = {
  /** Login of the user the agent is acting on behalf of */
  viewer: string;
  issues?: {
    number: number;
    title: string;
    author: string;
    body: string;
    labels?: string[];
  }[];
  pullRequests?: {
    number: number;
    title: string;
    author: string;
    body: string;
    /** Unified diff of the pull request */
    diff: string;
  }[];
};

/**
 * Variables of each eval test case, consumed by the harness.
 *
 * promptfoo: the shape of `TestCase.vars` for this suite (promptfoo types it
 * as `Record<string, VarValue>`).
 */
export type EvalVars = {
  /** The first user message */
  task: string;
  /** Commit to check out before the run */
  ref: string;
  /** Subsequent user messages, sent in order after the agent finishes a turn */
  followUps?: string[];
  /** Mocked GitHub state; when omitted, GitHub tools are unavailable */
  github?: GitHubFixture;
};
