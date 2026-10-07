import { normalizePath } from "@rnx-kit/tools-node";
import * as path from "node:path";
import type {
  FileWrite,
  GradingResult,
  ProviderResponse,
  ToolCall,
  Transcript,
} from "./types.ts";

type ShellCommand = {
  command: string;
  /** Files written via output redirection. */
  outputs: string[];
};

/**
 * Returns the path relative to the repository root, or `undefined` if it is
 * outside of it. Relative paths, and paths in sessions without a known root,
 * are returned as is.
 */
export function repoPath(p: string, root?: string): string | undefined {
  if (!root || !path.isAbsolute(p)) {
    return p;
  }

  const rel = normalizePath(path.relative(root, p));
  return rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)
    ? undefined
    : rel;
}

export function pass(reason: string): GradingResult {
  return { pass: true, score: 1, reason };
}

export function fail(reason: string): GradingResult {
  return { pass: false, score: 0, reason };
}

/**
 * Returns the added lines per file in a unified diff. Hunk line counts are
 * tracked so that added lines starting with `++ ` are not read as headers.
 */
export function parseDiff(diff: string): FileWrite[] {
  const writes: FileWrite[] = [];
  let current: FileWrite | undefined;
  let oldLines = 0;
  let newLines = 0;
  for (const line of diff.split("\n")) {
    if (oldLines > 0 || newLines > 0) {
      if (line.startsWith("+")) {
        --newLines;
        if (current) {
          current.content += line.substring(1) + "\n";
        }
      } else if (line.startsWith("-")) {
        --oldLines;
      } else if (!line.startsWith("\\")) {
        --oldLines;
        --newLines;
      }
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/);
    if (hunk) {
      oldLines = Number(hunk[1] ?? 1);
      newLines = Number(hunk[2] ?? 1);
    } else if (line.startsWith("+++ ")) {
      const file = line.substring(4).trim();
      current =
        file === "/dev/null"
          ? undefined
          : { path: file.replace(/^b\//, ""), content: "" };
      if (current) {
        writes.push(current);
      }
    } else if (line.startsWith("diff --git ")) {
      current = undefined;
    }
  }
  return writes;
}

/**
 * Extracts written files from an `apply_patch` input.
 */
export function parsePatch(patch: string): FileWrite[] {
  const writes: FileWrite[] = [];
  let current: FileWrite | undefined;
  for (const line of patch.split("\n")) {
    const m = line.match(/^\*\*\* (?:Add|Update) File: (.+)$/);
    if (m) {
      current = { path: m[1].trim(), content: "" };
      writes.push(current);
    } else if (line.startsWith("*** ")) {
      current = undefined;
    } else if (current && line.startsWith("+")) {
      current.content += line.substring(1) + "\n";
    }
  }
  return writes;
}

const parsedDiffs = new WeakMap<ProviderResponse["metadata"], FileWrite[]>();

/**
 * Returns files written during the session. Uses the diff if available since
 * it also captures files written by shell commands. The diff is only parsed
 * once per session; the result must not be modified.
 */
export function writtenFiles({ metadata }: ProviderResponse): FileWrite[] {
  if (!metadata.diff) {
    return metadata.transcript.filesWritten;
  }

  let files = parsedDiffs.get(metadata);
  if (!files) {
    files = parseDiff(metadata.diff);
    parsedDiffs.set(metadata, files);
  }
  return files;
}

export function isChangeset(file: string): boolean {
  return /^\.changeset\/(?!README\.md$)[^/]+\.md$/.test(file);
}

export function isTestFile(file: string): boolean {
  const segments = file.split("/");
  const name = segments.pop() ?? "";
  return segments.includes("test") && /\.test\.m?ts$/.test(name);
}

function unquote(token: string): string {
  return token.replace(/^(["'])(.*)\1$/s, "$2");
}

/**
 * Splits a shell command line into individual commands, and separates out
 * output redirections. Separators inside quotes are ignored, as are comments
 * and heredoc bodies, e.g. scripts passed to `python3 - <<EOF`.
 */
function scanCommands(commandLine: string): ShellCommand[] {
  const commands: ShellCommand[] = [];
  const lines = commandLine.split("\n");
  let current = "";
  let outputs: string[] = [];
  let quote = "";
  const flush = () => {
    const command = current.trim();
    if (command) {
      commands.push({ command, outputs });
    }
    current = "";
    outputs = [];
  };
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const heredocs: string[] = [];
    let continued = false;
    for (let j = 0; j < line.length; ++j) {
      const ch = line[j];
      if (quote) {
        if (ch === quote) {
          quote = "";
        } else if (ch === "\\" && quote === '"') {
          current += ch;
          ++j;
          current += line[j] ?? "";
          continue;
        }
        current += ch;
      } else if (ch === "'" || ch === '"') {
        quote = ch;
        current += ch;
      } else if (ch === "\\") {
        if (j === line.length - 1) {
          continued = true;
        } else {
          ++j;
          current += ch + line[j];
        }
      } else if (ch === "#" && (j === 0 || /\s/.test(line[j - 1]))) {
        break;
      } else if (ch === "<" && line[j + 1] === "<") {
        const heredoc = line.substring(j).match(/^<<-?\s*(["']?)(\w+)\1/);
        if (heredoc) {
          heredocs.push(heredoc[2]);
          j += heredoc[0].length - 1;
        } else {
          current += ch;
        }
      } else if (ch === ">" || (ch === "&" && line[j + 1] === ">")) {
        // Drop the file descriptor, e.g. `2>`
        current = current.replace(/(^|\s)\d$/, "$1");
        const redirect = line
          .substring(j)
          .match(/^&?>+\|?\s*(&\d|(?:"[^"]*"|'[^']*'|[^\s;|&<>])+)?/);
        const target = redirect?.[1];
        if (target && !target.startsWith("&")) {
          outputs.push(unquote(target));
        }
        j += (redirect?.[0].length ?? 1) - 1;
      } else if (
        ch === ";" ||
        ch === "|" ||
        (ch === "&" && line[j + 1] === "&")
      ) {
        flush();
        if (line[j + 1] === ch) {
          ++j;
        }
      } else {
        current += ch;
      }
    }

    if (quote || continued) {
      current += quote ? "\n" : " ";
      continue;
    }

    flush();
    for (const delimiter of heredocs) {
      while (++i < lines.length && lines[i].trim() !== delimiter) {
        // Skip the heredoc body
      }
    }
  }
  flush();
  return commands;
}

/**
 * Splits a shell command line into individual commands, without redirections.
 * Separators inside quotes are ignored, as are comments and heredoc bodies,
 * e.g. scripts passed to `python3 - <<EOF`.
 */
export function splitCommands(commandLine: string): string[] {
  return scanCommands(commandLine).map(({ command }) => command);
}

function tokenize(command: string): string[] {
  return (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(unquote);
}

/**
 * Returns files written by a shell command line, e.g. via output redirection,
 * `tee`, `sed -i`, `cp` or `mv`. Files under `/dev` and `/tmp` are ignored.
 */
function shellWrites(commandLine: string): string[] {
  const files: string[] = [];
  for (const { command, outputs } of scanCommands(commandLine)) {
    files.push(...outputs);

    const [name, ...args] = tokenize(command);
    const operands = args.filter((arg) => !arg.startsWith("-"));
    if (name === "tee") {
      files.push(...operands);
    } else if ((name === "cp" || name === "mv") && operands.length > 1) {
      files.push(operands[operands.length - 1]);
    } else if (
      name === "sed" &&
      operands.length > 1 &&
      args.some((arg) => /^(?:-[a-zA-Z]*i|--in-place)/.test(arg))
    ) {
      files.push(operands[operands.length - 1]);
    }
  }
  return files.filter((file) => !/^\/(?:dev|tmp)\//.test(file));
}

export function allCommands({ commands }: Transcript): string[] {
  return commands.flatMap(splitCommands);
}

function rawWrites({ name, arguments: args }: ToolCall): string[] {
  if (name === "apply_patch") {
    const patch = args.input ?? args.patch;
    const paths =
      typeof patch === "string" ? parsePatch(patch).map((w) => w.path) : [];
    return paths.length > 0 ? paths : [name];
  }

  if (/^(?:create|edit|str_replace_editor)$/.test(name)) {
    return args.command === "view" ? [] : [String(args.path ?? name)];
  }

  return typeof args.command === "string" ? shellWrites(args.command) : [];
}

/**
 * Returns files written by a tool call, including shell commands. Falls back to
 * the tool name if an editing tool's paths are unknown. If the repository root
 * is specified, absolute paths are made relative to it, and files outside of
 * it, e.g. Copilot CLI's session state, are ignored.
 */
export function toolWrites(call: ToolCall, root?: string): string[] {
  return rawWrites(call).flatMap((file) => {
    const rel = repoPath(file, root);
    return rel ? [rel] : [];
  });
}

/**
 * Returns paths that a tool call may read or write: the paths of file tools
 * and patches, and the operands and redirections of shell commands.
 */
export function toolPaths(call: ToolCall): string[] {
  const { name, arguments: args } = call;
  if (name === "apply_patch") {
    return rawWrites(call);
  }

  if (typeof args.path === "string") {
    return [args.path];
  }

  if (typeof args.command !== "string") {
    return [];
  }

  return scanCommands(args.command).flatMap(({ command, outputs }) => [
    ...tokenize(command)
      .slice(1)
      .filter((arg) => !arg.startsWith("-")),
    ...outputs,
  ]);
}

/**
 * Returns whether a tool call asked the user a question and got an answer.
 */
function isAnsweredQuestion({ name, success }: ToolCall): boolean {
  return name === "ask_user" && success === true;
}

/**
 * Returns files in the repository written before the user replied to the
 * agent's first response, i.e. before approval could have been given. The
 * reply is either a second user message, or an answer to a question asked with
 * the `ask_user` tool.
 *
 * Any reply counts, including answers to clarifying questions (e.g. "Which
 * file is the entry point?") and rejections, since telling them apart requires
 * understanding the conversation. Evals that need to know whether the user
 * actually approved should also use an `llm-rubric` assertion.
 */
export function writesBeforeApproval({ entries, root }: Transcript): string[] {
  const writes: string[] = [];
  let userMessages = 0;
  for (const entry of entries) {
    if (entry.type === "message") {
      if (entry.role === "user" && ++userMessages > 1) {
        break;
      }
    } else if (userMessages > 0 && isAnsweredQuestion(entry)) {
      break;
    } else {
      writes.push(...toolWrites(entry, root));
    }
  }
  return writes;
}
