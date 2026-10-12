/**
 * A command executed by the agent.
 *
 * The harness must record commands as they are executed, not as they are
 * typed, so that compound commands (`cd a && yarn build`) and scripts are
 * captured with the correct working directory. It does this by putting shims
 * first in `PATH` for every executable that evals match on (`gh`, `git`,
 * `node`, `npx`, `tsc`, `yarn`, and formatters/linters). A shim records its
 * `argv` as received, i.e. after the shell has removed quotes, and its working
 * directory, then runs the real executable with an environment variable set
 * so that nested invocations (e.g. `node` spawned by `yarn`) are not recorded.
 *
 * Executables invoked by path (e.g. `/usr/bin/git push`) bypass the shims. To
 * cover these, the harness also parses the agent's shell tool input with
 * `parse()` from `shell-quote`, splits the result on control operators (`&&`,
 * `||`, `;`, `|`), and adds any command that the shims did not record. The
 * working directory of these commands is best-effort.
 *
 * The executable may include a path; assertions only match on its basename.
 */
export type AgentCommand = {
  /** Executable and arguments, unquoted, e.g. `["yarn", "test", "a b.ts"]` */
  argv: string[];
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
  /**
   * Unified diff of all changes, including untracked files. The harness must
   * generate it with `git -c core.quotePath=false diff <base>`, otherwise git
   * escapes non-ASCII paths, which `parse-diff` does not decode.
   */
  diff: string;
  /** The agent's final message to the user */
  finalMessage: string;
  /** Absolute path to the agent's checkout, kept until assertions finish */
  workdir: string;
  /**
   * State recorded by the GitHub mock; only set if the test has a fixture. The
   * mock serves both the GitHub MCP tools and the `gh` CLI (via its shim), so
   * writes through either are recorded.
   */
  github?: {
    /**
     * Numbers of issues and pull requests that the agent created, edited,
     * labelled, commented on, reviewed, closed or merged. GitHub numbers issues
     * and pull requests from the same sequence, so numbers are unambiguous.
     */
    modified: number[];
  };
};

/**
 * Configuration for `ranCommand` and `didNotRunCommand`.
 */
export type CommandMatcher = {
  /**
   * Regular expression the command must match. Yarn's `--cwd <dir>` and
   * `workspace <name>` are removed before matching, and applied to the
   * working directory instead.
   */
  pattern: string;
  /** Regular expression the working directory must match */
  cwd?: string;
  /** The command must run in the directory of a workspace package */
  inPackage?: boolean;
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
  /** Files of at most one workspace package may change */
  singlePackage?: boolean;
};

/**
 * Configuration for `matchesContent`.
 */
export type ContentMatcher = {
  /** Regular expression matching the paths of the files to check */
  files: string;
  /**
   * Each of these must be matched by every matching file, or by at least one
   * if `match` is `"any"`
   */
  required?: string[];
  /** Whether `required` applies to every matching file (default) or any */
  match?: "all" | "any";
  /** No matching file may match any of these */
  forbidden?: string[];
  /** Only check lines added in the diff instead of the full content */
  addedLinesOnly?: boolean;
};

/**
 * Configuration for `passesOxlint`.
 */
export type OxlintMatcher = {
  /** Regular expression matched against changed file paths */
  files: string;
  /** Path to an oxlint config, relative to the `evals` workspace */
  config: string;
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
};

/**
 * Configuration for `notModifiedOnGitHub`.
 */
export type GitHubMatcher = {
  /** Issue and pull request numbers that must not be modified */
  numbers: number[];
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
