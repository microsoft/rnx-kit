import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import type {
  PermissionRequest,
  PermissionRequestResult,
  SessionEvent,
} from "@github/copilot-sdk";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentRun, AgentToolCall, EvalVars } from "../types.ts";
import type { Run } from "./checkout.ts";
import {
  YARN_CACHE,
  collectChanges,
  createRun,
  removeRun,
} from "./checkout.ts";
import { GitHubMock, githubTools } from "./github.ts";
import type { ShellInput } from "./shell.ts";
import { mergeCommands } from "./shell.ts";
import type { RecordedCommand } from "./shim.ts";
import {
  COMMANDS_LOG_VAR,
  GITHUB_FIXTURE_VAR,
  GITHUB_LOG_VAR,
  SHIMMED,
  writeShims,
} from "./shim.ts";

/** Maximum duration of a single agent turn */
const TURN_TIMEOUT_MS = 20 * 60 * 1000;

/** Shell tools; their input is parsed instead of recorded as a tool call */
const SHELL_TOOLS = ["bash"];

/** Tools that are not recorded because they have no effect */
const IGNORED_TOOLS = ["report_intent"];

/** Built-in tools that the agent may not use */
const EXCLUDED_TOOLS = ["web_fetch", "web_search"];

type ProviderOptions = {
  id?: string;
  config?: {
    /** Model to use, e.g. `claude-sonnet-4.5`; defaults to the CLI's default */
    model?: string;
  };
};

type CallApiContext = {
  vars: Record<string, unknown>;
};

type CallApiOptions = {
  abortSignal?: AbortSignal;
};

export function getToken(): string {
  const token =
    process.env["COPILOT_GITHUB_TOKEN"] ||
    process.env["GH_TOKEN"] ||
    process.env["GITHUB_TOKEN"];
  if (token) {
    return token;
  }

  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch (_) {
    throw new Error(
      "A GitHub token with Copilot access is required; set COPILOT_GITHUB_TOKEN or log in with 'gh auth login'"
    );
  }
}

/** Returns `PATH` without `binDir` and without npx's package directories */
function searchPath(): string[] {
  return (process.env["PATH"] ?? "")
    .split(path.delimiter)
    .filter((p) => p && !/[\\/](_npx|node_modules)[\\/]/.test(p));
}

function readJSONLines<T>(file: string): T[] {
  if (!fs.existsSync(file)) {
    return [];
  }
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function isInside(dir: string, p: string | undefined): boolean {
  if (!p) {
    return false;
  }
  const relative = path.relative(dir, path.resolve(dir, p));
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function reject(feedback: string): PermissionRequestResult {
  return { kind: "reject", feedback };
}

/**
 * Allows everything inside the run's directory except network access.
 */
function permissionHandler(dir: string) {
  return (request: PermissionRequest): PermissionRequestResult => {
    switch (request.kind) {
      case "shell":
        return request.possibleUrls.length > 0
          ? reject("Network access is not available")
          : { kind: "approve-once" };
      case "read":
        return isInside(dir, request.resolvedPath ?? request.path)
          ? { kind: "approve-once" }
          : reject(`Access outside ${dir} is not allowed`);
      case "write":
        return isInside(dir, request.resolvedPath ?? request.fileName)
          ? { kind: "approve-once" }
          : reject(`Access outside ${dir} is not allowed`);
      case "custom-tool":
        return { kind: "approve-once" };
      default:
        return reject(`'${request.kind}' is not allowed`);
    }
  };
}

/**
 * Builds the agent's environment from scratch so that no credentials leak.
 */
function agentEnv(run: Run, binDir: string, github: boolean) {
  const home = path.join(run.dir, "home");
  const tmp = path.join(run.dir, "tmp");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(
    path.join(home, ".gitconfig"),
    "[user]\n\tname = rnx-kit evals\n\temail = evals@rnx-kit.invalid\n"
  );

  const env: Record<string, string> = {
    PATH: [binDir, ...searchPath()].join(path.delimiter),
    HOME: home,
    TMPDIR: tmp,
    LANG: process.env["LANG"] ?? "C.UTF-8",
    COREPACK_HOME:
      process.env["COREPACK_HOME"] ??
      path.join(process.env["HOME"] ?? home, ".cache", "node", "corepack"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    NX_DAEMON: "false",
    NX_NO_CLOUD: "true",
    YARN_CACHE_FOLDER: YARN_CACHE,
    YARN_ENABLE_TELEMETRY: "0",
    [COMMANDS_LOG_VAR]: path.join(run.dir, "commands.jsonl"),
  };
  if (github) {
    env[GITHUB_FIXTURE_VAR] = path.join(run.dir, "github.json");
    env[GITHUB_LOG_VAR] = path.join(run.dir, "github.jsonl");
  }
  return env;
}

async function runAgent(
  run: Run,
  vars: EvalVars,
  model: string | undefined,
  abortSignal: AbortSignal | undefined
): Promise<AgentRun> {
  const binDir = path.join(run.dir, "bin");
  writeShims(binDir, searchPath());

  const env = agentEnv(run, binDir, Boolean(vars.github));

  const mock = vars.github
    ? new GitHubMock(vars.github, env[GITHUB_LOG_VAR])
    : undefined;
  if (vars.github) {
    fs.writeFileSync(env[GITHUB_FIXTURE_VAR], JSON.stringify(vars.github));
  }

  const toolCalls: AgentToolCall[] = [];
  const shellInputs: ShellInput[] = [];
  const onEvent = (event: SessionEvent) => {
    if (event.type !== "tool.execution_start") {
      return;
    }

    const { toolName, arguments: args } = event.data;
    const input = (args ?? {}) as Record<string, unknown>;
    if (SHELL_TOOLS.includes(toolName)) {
      if (typeof input["command"] === "string") {
        const time = Date.parse(event.timestamp);
        shellInputs.push({ command: input["command"], time });
      }
    } else if (!IGNORED_TOOLS.includes(toolName)) {
      toolCalls.push({ name: toolName, arguments: input });
    }
  };

  const token = getToken();
  const client = new CopilotClient({
    // A child process with an environment built from scratch
    connection: RuntimeConnection.forStdio({ env }),
    baseDirectory: path.join(run.dir, "copilot"),
    workingDirectory: run.workdir,
    logLevel: "error",
    useLoggedInUser: false,
  });

  const abort = () => void client.forceStop();
  abortSignal?.addEventListener("abort", abort);
  try {
    const session = await client.createSession({
      model,
      workingDirectory: run.workdir,
      gitHubTokenProvider: () => ({
        kind: "token",
        accessToken: token,
        expiresIn: 8 * 60 * 60,
      }),
      onPermissionRequest: permissionHandler(run.dir),
      onEvent,
      tools: mock ? githubTools(mock) : [],
      excludedTools: EXCLUDED_TOOLS,
      // Replaced by the mock, or unavailable
      disabledMcpServers: ["github-mcp-server"],
      memory: { enabled: false },
    });

    let finalMessage = "";
    for (const prompt of [vars.task, ...(vars.followUps ?? [])]) {
      abortSignal?.throwIfAborted();
      const reply = await session.sendAndWait({ prompt }, TURN_TIMEOUT_MS);
      finalMessage = reply?.data.content ?? "";
    }

    await session.disconnect();

    const { files, diff } = await collectChanges(run.workdir, vars.ref);
    const recorded = readJSONLines<RecordedCommand>(env[COMMANDS_LOG_VAR]);
    const commands = mergeCommands(run.workdir, recorded, shellInputs, SHIMMED);

    return {
      commands,
      toolCalls,
      files,
      diff,
      finalMessage,
      workdir: run.workdir,
      ...(mock ? { github: { modified: mock.modified() } } : {}),
    };
  } finally {
    abortSignal?.removeEventListener("abort", abort);
    await client.stop();
  }
}

/**
 * promptfoo provider that runs the Copilot agent in an isolated checkout and
 * returns an `AgentRun`. The checkout is removed by the `afterEach` hook in
 * `hooks.ts`, after assertions have run.
 */
// oxlint-disable-next-line import/no-default-export
export default class CopilotAgentProvider {
  private readonly providerId: string;
  private readonly model: string | undefined;

  constructor({ id, config }: ProviderOptions = {}) {
    this.providerId = id ?? "copilot-agent";
    this.model = config?.model;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(
    _prompt: string,
    context?: CallApiContext,
    options?: CallApiOptions
  ): Promise<{ output: AgentRun } | { error: string }> {
    const vars = context?.vars as EvalVars | undefined;
    if (!vars?.task || !vars.ref) {
      return { error: "Missing required vars: task, ref" };
    }

    let run: Run | undefined;
    try {
      run = await createRun(vars.ref);
      const output = await runAgent(
        run,
        vars,
        this.model,
        options?.abortSignal
      );
      return { output };
    } catch (e) {
      if (run) {
        removeRun(run.dir);
      }
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}
