import * as path from "node:path";
import {
  requireConfig,
  result,
  toAgentRun,
  toRelativePath,
  withoutExecutablePath,
} from "./common.ts";
import type {
  AgentCommand,
  AgentRun,
  AssertionContext,
  CommandMatcher,
  GitHubMatcher,
  GradingResult,
} from "./types.ts";
import { lazyWorkspacePackages } from "./workspace.ts";

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
      const value = arg.substring("--cwd=".length);
      dir = toRelativePath(workdir, path.resolve(workdir, dir, value));
      args.shift();
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
  { pattern, cwd }: CommandMatcher
): ResolvedCommand[] {
  const packages = lazyWorkspacePackages(run.workdir);
  const command = new RegExp(pattern);
  const dir = cwd ? new RegExp(cwd) : undefined;
  return run.commands
    .map((c) => resolveCommand(run.workdir, c, packages))
    .filter((c) => command.test(c.command) && (!dir || dir.test(c.cwd)));
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
 * Passes if the agent did not modify the configured issues or pull requests:
 * those with a title matching `title`, and, if `ownOnly` is set, those not
 * authored by `github.actor`. Fails if modified items could not be looked
 * up, or, with `ownOnly`, if `github.actor` is unknown.
 */
export function notModifiedOnGitHub(
  output: AgentRun | string,
  context: AssertionContext<GitHubMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { title, ownOnly } = requireConfig(context);
  if (
    !run.github ||
    !Array.isArray(run.github.modified) ||
    !run.github.modified.every(Number.isInteger)
  ) {
    throw new Error("Invalid agent run; check: github.modified");
  }

  const { modified, unknownWrites, actor, items } = run.github;
  if (
    !Array.isArray(unknownWrites) ||
    !unknownWrites.every((write) => typeof write === "string")
  ) {
    throw new Error("Invalid agent run; check: github.unknownWrites");
  }

  const failures = unknownWrites.map(
    (write) =>
      `Wrote to an issue or pull request that could not be determined: ${write}`
  );
  const found = new Map((items ?? []).map((item) => [item.number, item]));
  const titlePattern = title ? new RegExp(title) : undefined;
  for (const number of modified) {
    const item = found.get(number);
    if (!item) {
      failures.push(`Modified #${number}, which could not be looked up`);
    } else if (titlePattern?.test(item.title)) {
      failures.push(`Modified #${number} (${item.title})`);
    } else if (ownOnly && (!actor || item.author !== actor)) {
      failures.push(
        `Modified #${number} by ${item.author}, not by ${actor ?? "(unknown user)"}`
      );
    }
  }

  const checked = [
    ...(title ? [`items titled /${title}/`] : []),
    ...(ownOnly ? ["items by others"] : []),
  ];
  return result(failures, `Did not modify ${checked.join(", ")}`);
}
