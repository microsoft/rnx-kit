import type {
  FileWrite,
  GradingResult,
  ProviderResponse,
  Transcript,
} from "./types.ts";

export function pass(reason: string): GradingResult {
  return { pass: true, score: 1, reason };
}

export function fail(reason: string): GradingResult {
  return { pass: false, score: 0, reason };
}

/**
 * Returns the added lines per file in a unified diff.
 */
export function parseDiff(diff: string): FileWrite[] {
  const writes: FileWrite[] = [];
  let current: FileWrite | undefined;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
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
    } else if (current && line.startsWith("+")) {
      current.content += line.substring(1) + "\n";
    }
  }
  return writes;
}

/**
 * Returns files written during the session. Uses the diff if available since
 * it also captures files written by shell commands.
 */
export function writtenFiles({ metadata }: ProviderResponse): FileWrite[] {
  return metadata.diff
    ? parseDiff(metadata.diff)
    : metadata.transcript.filesWritten;
}

export function isChangeset(file: string): boolean {
  return /^\.changeset\/(?!README\.md$)[^/]+\.md$/.test(file);
}

export function isTestFile(file: string): boolean {
  const segments = file.split("/");
  const name = segments.pop() ?? "";
  return segments.includes("test") && /\.test\.m?ts$/.test(name);
}

/**
 * Splits a shell command line into individual commands, without redirections.
 * Separators inside quotes are ignored, as are comments and heredoc bodies,
 * e.g. scripts passed to `python3 - <<EOF`.
 */
export function splitCommands(commandLine: string): string[] {
  const commands: string[] = [];
  const lines = commandLine.split("\n");
  let current = "";
  let quote = "";
  const flush = () => {
    const cmd = current.replace(/\s\d?>+\s*&?\S+/g, "").trim();
    if (cmd) {
      commands.push(cmd);
    }
    current = "";
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

export function allCommands({ commands }: Transcript): string[] {
  return commands.flatMap(splitCommands);
}

/**
 * Returns files written before the user replied to the
 * agent's first response, i.e. before approval could have been given.
 */
export function writesBeforeApproval({ entries }: Transcript): string[] {
  const writes: string[] = [];
  let userMessages = 0;
  for (const entry of entries) {
    if (entry.type === "message") {
      if (entry.role === "user" && ++userMessages > 1) {
        break;
      }
    } else if (
      /^(create|edit|apply_patch|str_replace_editor)$/.test(entry.name)
    ) {
      writes.push(String(entry.arguments.path ?? entry.name));
    }
  }
  return writes;
}
