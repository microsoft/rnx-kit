import * as path from "node:path";
import { requireConfig, result, toAgentRun, toRelativePath } from "./common.ts";
import type {
  AgentCommand,
  AgentRun,
  AssertionContext,
  CommandMatcher,
  GitHubMatcher,
  GradingResult,
  ToolCallMatcher,
} from "./types.ts";
import { lazyWorkspacePackages } from "./workspace.ts";

/**
 * Reduces the executable to its basename without Windows extensions, e.g.
 * `/usr/bin/git` -> `git` and `C:\bin\yarn.cmd` -> `yarn`.
 */
function withoutExecutablePath(executable: string): string {
  return path.win32.basename(executable).replace(/\.(bat|cmd|exe|ps1)$/i, "");
}

type ResolvedCommand = { command: string; cwd: string };

/**
 * Joins the arguments of a command for matching after stripping the executable
 * path. For Yarn, also applies `--cwd <dir>` and `workspace <name>` to the
 * working directory, and drops `run`, e.g. `yarn workspace @rnx-kit/cli run
 * build` in `.` becomes `yarn build` in `packages/cli`.
 */
function resolveCommand(
  workdir: string,
  { argv, cwd }: AgentCommand,
  packages: () => Map<string, string>
): ResolvedCommand {
  const [executable = "", ...args] = argv;
  const name = withoutExecutablePath(executable);
  if (name !== "yarn") {
    return { command: [name, ...args].join(" "), cwd };
  }

  let dir = cwd;
  while (args.length > 0) {
    const [arg, value] = args;
    if (arg === "--cwd" && value) {
      dir = toRelativePath(workdir, path.resolve(workdir, dir, value));
      args.splice(0, 2);
    } else if (arg.startsWith("--cwd=")) {
      const value = arg.slice("--cwd=".length);
      dir = toRelativePath(workdir, path.resolve(workdir, dir, value));
      args.splice(0, 1);
    } else if (arg === "workspace" && value && packages().has(value)) {
      dir = packages().get(value) ?? dir;
      args.splice(0, 2);
    } else {
      break;
    }
  }
  if (args[0] === "run") {
    args.shift();
  }
  return { command: ["yarn", ...args].join(" "), cwd: dir };
}

function commandMatches(
  run: AgentRun,
  { pattern, cwd, inPackage }: CommandMatcher
) {
  const packages = lazyWorkspacePackages(run.workdir);
  const command = new RegExp(pattern);
  const dir = cwd ? new RegExp(cwd) : undefined;
  let packageDirs: Set<string> | undefined;
  const isPackageDir = (dir: string) =>
    (packageDirs ??= new Set(packages().values())).has(dir);
  return run.commands
    .map((c) => resolveCommand(run.workdir, c, packages))
    .filter(
      (c) =>
        command.test(c.command) &&
        (!dir || dir.test(c.cwd)) &&
        (!inPackage || isPackageDir(c.cwd))
    );
}

/**
 * Passes if the agent ran a command matching the configured pattern.
 */
export function ranCommand(
  output: AgentRun | string,
  context: AssertionContext<CommandMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const matches = commandMatches(run, config);
  return result(
    matches.length > 0 ? [] : [`No command matched /${config.pattern}/`],
    `Ran: ${matches.map((c) => c.command).join("; ")}`
  );
}

/**
 * Passes if the agent did not run any command matching the configured pattern.
 */
export function didNotRunCommand(
  output: AgentRun | string,
  context: AssertionContext<CommandMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const matches = commandMatches(run, config);
  return result(
    matches.map((c) => `Unexpected command in ${c.cwd}: ${c.command}`),
    `No command matched /${config.pattern}/`
  );
}

/**
 * Passes if the agent did not call any tool matching the configured name.
 */
export function noToolCall(
  output: AgentRun | string,
  context: AssertionContext<ToolCallMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const name = new RegExp(config.name);
  const calls = run.toolCalls.filter((call) => name.test(call.name));
  return result(
    calls.map(
      (c) => `Unexpected tool call: ${c.name} ${JSON.stringify(c.arguments)}`
    ),
    `No tool call matched /${config.name}/`
  );
}

/**
 * Passes if the agent did not modify the configured issues or pull requests.
 */
export function notModifiedOnGitHub(
  output: AgentRun | string,
  context: AssertionContext<GitHubMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { numbers } = requireConfig(context);
  if (
    !run.github ||
    !Array.isArray(run.github.modified) ||
    !run.github.modified.every(Number.isInteger)
  ) {
    throw new Error("Invalid agent run; check: github.modified");
  }

  const { modified } = run.github;
  return result(
    numbers
      .filter((number) => modified.includes(number))
      .map((number) => `Modified #${number}`),
    `Did not modify ${numbers.map((number) => `#${number}`).join(", ")}`
  );
}
