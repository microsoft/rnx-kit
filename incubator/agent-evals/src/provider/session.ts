import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentRequest, AgentToolCall } from "../types.ts";

/** Shell tools; their input is parsed into commands */
const SHELL_TOOLS = ["bash", "powershell"];

/** Tools that are not recorded because they have no effect */
const IGNORED_TOOLS = ["report_intent"];

/**
 * Subset of the events that the Copilot runtime writes to `events.jsonl`.
 *
 * Note: The file format is not documented; these match `SessionEvent` in
 * `@github/copilot-sdk`.
 */
type SessionEvent =
  | {
      type: "session.start" | "session.resume";
      data: {
        context?: {
          cwd?: string;
          gitRoot?: string;
          branch?: string;
          headCommit?: string;
        };
      };
    }
  | { type: "user.message"; data: { content?: string } }
  | { type: "assistant.message"; data: { content?: string } }
  | {
      type: "tool.execution_start";
      data: {
        toolName: string;
        arguments?: Record<string, unknown>;
        mcpServerName?: string;
        mcpToolName?: string;
      };
    }
  | { type: "other"; data: unknown };

export type SessionToolCall = AgentToolCall & {
  /** Name of the MCP server providing the tool, if any */
  server?: string;
  /** Name of the tool on its MCP server */
  serverTool?: string;
};

export type Session = {
  id: string;
  /** Root of the repository the session worked in */
  root: string;
  /** Directory the session started in; shell inputs start there */
  cwd: string;
  /** Branch checked out when the session was last started or resumed */
  branch?: string;
  /** Commit checked out when the session started */
  baseCommit?: string;
  /** Inputs to shell tools, in order */
  shellInputs: string[];
  /** Calls to other tools, in order */
  toolCalls: SessionToolCall[];
  requests: AgentRequest[];
};

function stateDir(): string {
  const home =
    process.env["COPILOT_HOME"] || path.join(os.homedir(), ".copilot");
  return path.join(home, "session-state");
}

/**
 * Returns the first line of `file`, or `""` if it is longer than 64 KB. The
 * first event is `session.start`, which is far shorter.
 */
function readFirstLine(file: string): string {
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const content = buffer.subarray(0, fs.readSync(fd, buffer));
    const end = content.indexOf("\n");
    return end >= 0 ? content.subarray(0, end).toString("utf-8") : "";
  } finally {
    fs.closeSync(fd);
  }
}

function parseEvent(line: string): SessionEvent | undefined {
  try {
    return JSON.parse(line);
  } catch (_) {
    // The last line may be incomplete if the session is still running
    return undefined;
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return Error.isError(e) && "code" in e && e["code"] === "EPERM";
  }
}

/**
 * Returns whether a Copilot process currently has the session open.
 */
function isInUse(dir: string): boolean {
  return fs.readdirSync(dir).some((name) => {
    const match = name.match(/^inuse\.(\d+)\.lock$/);
    return match ? isRunning(Number(match[1])) : false;
  });
}

function sameDir(a: string | undefined, b: string): boolean {
  if (!a) {
    return false;
  }

  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch (_) {
    return false;
  }
}

/**
 * Returns the ID of the most recently updated session that worked in `root`
 * and is not in use, e.g. by the session running the audit.
 */
function findLatestSession(root: string): string {
  const base = stateDir();
  const candidates: { id: string; time: number }[] = [];
  for (const id of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const dir = path.join(base, id);
    const events = path.join(dir, "events.jsonl");
    if (!fs.existsSync(events) || isInUse(dir)) {
      continue;
    }

    const start = parseEvent(readFirstLine(events));
    const context =
      start?.type === "session.start" ? start.data.context : undefined;
    if (sameDir(context?.gitRoot ?? context?.cwd, root)) {
      candidates.push({ id, time: fs.statSync(events).mtimeMs });
    }
  }

  const latest = candidates.sort((a, b) => b.time - a.time)[0];
  if (!latest) {
    throw new Error(
      `No Copilot session for ${root} found in ${base}; pass one with '--var copilotSession=<id>'`
    );
  }
  return latest.id;
}

/**
 * Reads a Copilot session from its event log without modifying it. If `id` is
 * omitted, reads the most recently updated session that worked in `root`.
 */
export function readSession(root: string, id?: string): Session {
  if (id !== undefined && !/^[\w-]+$/.test(id)) {
    throw new Error(`Invalid session ID: ${id}`);
  }

  const sessionId = id || findLatestSession(root);
  const file = path.join(stateDir(), sessionId, "events.jsonl");
  if (!fs.existsSync(file)) {
    throw new Error(
      `Session ${sessionId} not found in ${stateDir()}; cloud sessions can only be audited on the runner that ran them`
    );
  }

  const session: Session = {
    id: sessionId,
    root,
    cwd: root,
    shellInputs: [],
    toolCalls: [],
    requests: [],
  };
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const event = line ? parseEvent(line) : undefined;
    switch (event?.type) {
      case "session.start":
      case "session.resume": {
        const { context } = event.data;
        if (event.type === "session.start") {
          session.root = context?.gitRoot ?? context?.cwd ?? root;
          session.cwd = context?.cwd ?? session.root;
          session.baseCommit = context?.headCommit;
        }
        session.branch = context?.branch ?? session.branch;
        break;
      }

      case "user.message":
        session.requests.push({ prompt: event.data.content ?? "", reply: "" });
        break;

      case "assistant.message": {
        const request = session.requests[session.requests.length - 1];
        if (request && event.data.content) {
          request.reply = event.data.content;
        }
        break;
      }

      case "tool.execution_start": {
        const { toolName, arguments: args = {}, mcpServerName } = event.data;
        if (SHELL_TOOLS.includes(toolName)) {
          if (typeof args["command"] === "string") {
            session.shellInputs.push(args["command"]);
          }
        } else if (!IGNORED_TOOLS.includes(toolName)) {
          session.toolCalls.push({
            name: toolName,
            arguments: args,
            ...(mcpServerName
              ? { server: mcpServerName, serverTool: event.data.mcpToolName }
              : {}),
          });
        }
        break;
      }
    }
  }
  return session;
}
