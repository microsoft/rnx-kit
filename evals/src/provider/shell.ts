import * as path from "node:path";
import { parse } from "shell-quote";
import { toRelativePath } from "../common.ts";
import type { AgentCommand } from "../types.ts";

const CONTROL_OPERATORS = new Set([
  "&&",
  "||",
  ";",
  ";;",
  "|",
  "|&",
  "&",
  "(",
  ")",
]);

/**
 * Replaces unquoted newlines with `;`, which `shell-quote` does not treat as
 * command separators.
 */
function separateLines(input: string): string {
  let result = "";
  let quote = "";
  for (let i = 0; i < input.length; ++i) {
    const c = input[i];
    if (c === "\\" && quote !== "'") {
      result += c + (input[++i] ?? "");
      continue;
    }
    if (quote) {
      if (c === quote) {
        quote = "";
      }
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (c === "\n") {
      result += ";";
      continue;
    }
    result += c;
  }
  return result;
}

/**
 * Splits shell input into commands on control operators. Redirections and
 * leading variable assignments are removed; variables are left unexpanded.
 */
export function parseShellInput(input: string): string[][] {
  const commands: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      commands.push(current);
    }
    current = [];
  };

  const tokens = parse(separateLines(input), (key) => `$${key}`);
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    if (typeof token === "string") {
      if (current.length > 0 || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
        current.push(token);
      }
    } else if ("comment" in token) {
      break;
    } else if (token.op === "glob") {
      current.push(token.pattern);
    } else if (CONTROL_OPERATORS.has(token.op)) {
      flush();
    } else {
      // Redirection, e.g. `2>&1` is parsed as `2`, `>&`, `1`
      if (/^\d+$/.test(current[current.length - 1] ?? "")) {
        current.pop();
      }
      ++i;
    }
  }
  flush();
  return commands;
}

/**
 * Returns the commands in the shell tool's inputs, in order. The working
 * directory starts at `workdir`, is tracked through `cd` and is best-effort.
 */
export function parseCommands(
  workdir: string,
  inputs: string[]
): AgentCommand[] {
  const commands: AgentCommand[] = [];
  let cwd = workdir;
  for (const input of inputs) {
    for (const argv of parseShellInput(input)) {
      const [executable, ...args] = argv;
      if (executable === "cd") {
        const target = args[0];
        if (!target) {
          cwd = workdir;
        } else if (!/^[-~$]/.test(target)) {
          cwd = path.resolve(cwd, target);
        }
      } else {
        commands.push({ argv, cwd: toRelativePath(workdir, cwd) });
      }
    }
  }
  return commands;
}
