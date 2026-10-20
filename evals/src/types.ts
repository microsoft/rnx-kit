/**
 * A command executed by the agent.
 *
 * The provider reconstructs commands from the session's shell tool input: it
 * parses the input with `parse()` from `shell-quote` and splits the result on
 * control operators (`&&`, `||`, `;`, `|`). Arguments are unquoted, but
 * variables and substitutions are not expanded. The working directory is
 * tracked through `cd` and is best-effort.
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
 * A user request and the agent's last reply to it.
 */
export type AgentRequest = {
  prompt: string;
  reply: string;
};

/**
 * An issue or pull request that the agent modified, as looked up on GitHub.
 */
export type GitHubItem = {
  number: number;
  title: string;
  /** Login of the author */
  author: string;
};

/**
 * Output of a single agent session, as returned by the provider to promptfoo.
 *
 * promptfoo: the value of `ProviderResponse.output`, which promptfoo types as
 * `any` and passes unchanged to `javascript` assertions.
 */
export type AgentRun = {
  commands: AgentCommand[];
  toolCalls: AgentToolCall[];
  files: AgentChangedFile[];
  /**
   * Unified diff of all changes, including untracked files. The provider must
   * generate it with `git -c core.quotePath=false diff <base>`, otherwise git
   * escapes non-ASCII paths, which `parse-diff` does not decode.
   */
  diff: string;
  /** The agent's final message to the user */
  finalMessage: string;
  /** User requests in order, with the agent's last reply to each */
  requests?: AgentRequest[];
  /** Absolute path to the checkout the session worked in */
  workdir: string;
  /**
   * GitHub writes made by the agent through the GitHub MCP tools or the `gh`
   * CLI. The write calls themselves are in `toolCalls` and `commands`.
   */
  github?: {
    /**
     * Numbers of issues and pull requests that the agent edited, labelled,
     * commented on, reviewed, closed or merged. GitHub numbers issues and pull
     * requests from the same sequence, so numbers are unambiguous.
     */
    modified: number[];
    /** Login of the user the agent acted on behalf of, if known */
    viewer?: string;
    /** The items in `modified`, if they could be looked up */
    items?: GitHubItem[];
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
};

/**
 * Configuration for `matchesContent`.
 */
export type ContentMatcher = {
  /** Regular expression matching the paths of the files to check */
  files: string;
  /** No matching file may contain a match for any of these */
  forbidden?: string[];
  /** Only check lines added in the diff instead of the full content */
  addedLinesOnly?: boolean;
  /** Pass instead of failing if no changed files match */
  optional?: boolean;
};

/**
 * Configuration for `usesPackageTestRunner`.
 */
export type TestRunnerMatcher = {
  /** Pass instead of failing if no test files changed */
  optional?: boolean;
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
  /** Packages that must not be released by the added change files */
  forbidden?: string[];
};

/**
 * Configuration for `notModifiedOnGitHub`.
 */
export type GitHubMatcher = {
  /** Regular expression; items with a matching title must not be modified */
  title?: string;
  /** Only items authored by `github.viewer` may be modified */
  ownOnly?: boolean;
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
 * Variables of each test case, consumed by the provider.
 *
 * promptfoo: the shape of `TestCase.vars` for this suite (promptfoo types it
 * as `Record<string, VarValue>`).
 */
export type EvalVars = {
  /**
   * ID of the Copilot session to audit; defaults to the most recently updated
   * session in this repository that is not in use. Not named `session`
   * because promptfoo redacts fields with that name.
   */
  copilotSession?: string;
};
