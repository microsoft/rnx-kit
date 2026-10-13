import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { quote } from "shell-quote";
import type { GitHubFixture } from "../types.ts";
import { GitHubMock, gh } from "./github.ts";

/** Executables that are recorded when the agent runs them */
export const SHIMMED = [
  "eslint",
  "gh",
  "git",
  "node",
  "npx",
  "oxfmt",
  "oxlint",
  "prettier",
  "tsc",
  "yarn",
];

/** Set for everything a shim runs, so that nested commands are not recorded */
export const NESTED_VAR = "RNX_EVALS_NESTED";
/** Path to the JSONL file that shims append commands to */
export const COMMANDS_LOG_VAR = "RNX_EVALS_COMMANDS_LOG";
/** Path to the GitHub fixture; unset if GitHub is unavailable */
export const GITHUB_FIXTURE_VAR = "RNX_EVALS_GITHUB_FIXTURE";
/** Path to the file that the GitHub mock records writes in */
export const GITHUB_LOG_VAR = "RNX_EVALS_GITHUB_LOG";

/** A command as recorded by a shim */
export type RecordedCommand = {
  argv: string[];
  /** Absolute working directory */
  cwd: string;
  /** Milliseconds since epoch */
  time: number;
};

function findExecutable(
  name: string,
  searchPath: string[]
): string | undefined {
  for (const dir of searchPath) {
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_) {
      // Try the next one
    }
  }
  return undefined;
}

/**
 * Writes a shim for each of `SHIMMED` to `binDir`. `searchPath` is used to
 * find the real executables and must not include `binDir`.
 */
export function writeShims(binDir: string, searchPath: string[]): void {
  const self = fileURLToPath(import.meta.url);
  fs.mkdirSync(binDir, { recursive: true });
  for (const name of SHIMMED) {
    const real = name === "gh" ? "" : (findExecutable(name, searchPath) ?? "");
    const record = quote([
      process.execPath,
      "--disable-warning=ExperimentalWarning",
      self,
      name,
      real,
    ]);

    const lines = ["#!/bin/sh"];
    if (name === "gh") {
      // `gh` is always served by the mock
    } else if (real) {
      lines.push(`[ -n "$${NESTED_VAR}" ] && exec ${quote([real])} "$@"`);
    } else {
      lines.push(
        `[ -n "$${NESTED_VAR}" ] && { echo "${name}: command not found" >&2; exit 127; }`
      );
    }
    lines.push(`exec ${record} "$@"`, "");

    const shim = path.join(binDir, name);
    fs.writeFileSync(shim, lines.join("\n"), { mode: 0o755 });
  }
}

/**
 * Records the command, then runs the real executable (or the GitHub mock for
 * `gh`) and exits with its status.
 */
function main([name, real, ...args]: string[]): void {
  if (!process.env[NESTED_VAR]) {
    const log = process.env[COMMANDS_LOG_VAR];
    if (log) {
      const command: RecordedCommand = {
        argv: [name, ...args],
        cwd: process.cwd(),
        time: Date.now(),
      };
      fs.appendFileSync(log, JSON.stringify(command) + "\n");
    }
  }

  if (name === "gh") {
    const fixture = process.env[GITHUB_FIXTURE_VAR];
    const log = process.env[GITHUB_LOG_VAR];
    if (!fixture || !log) {
      process.stderr.write("gh: GitHub is not available in this environment\n");
      process.exitCode = 1;
      return;
    }

    const data: GitHubFixture = JSON.parse(fs.readFileSync(fixture, "utf8"));
    const { status, stdout, stderr } = gh(new GitHubMock(data, log), args);
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    process.exitCode = status;
    return;
  }

  if (!real) {
    process.stderr.write(`${name}: command not found\n`);
    process.exitCode = 127;
    return;
  }

  const result = spawnSync(real, args, {
    stdio: "inherit",
    env: { ...process.env, [NESTED_VAR]: "1" },
  });
  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
  process.exitCode = result.error ? 127 : (result.status ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
