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
 */
export function splitCommands(commandLine: string): string[] {
  return commandLine
    .split(/&&|\|\||[;|\n]/)
    .map((cmd) => cmd.replace(/\s\d?>+\s*&?\S+/g, "").trim())
    .filter(Boolean);
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
