import { spawnSync } from "node:child_process";
import { styleText } from "node:util";

export const DEFAULT_BRANCH = "origin/main";

// See https://github.com/microsoft/rnx-kit/security/code-scanning/35
export const REJECTED_ARGS = ["--upload-pack", "-u"];

function sanitize(args: string[]): string[] {
  for (const a of args) {
    if (REJECTED_ARGS.some((rejected) => a.startsWith(rejected))) {
      throw new Error(`Unsafe git argument rejected: ${a}`);
    }
  }
  return args;
}

/**
 * Executes `git` with specified arguments.
 * @returns The output of the execution
 */
export function git(...args: string[]): string {
  const { stderr, stdout } = spawnSync("git", sanitize(args));
  const message = stderr.toString().trim();
  if (message) {
    console.error(styleText(["red", "bold"], "error"), message);
  }
  return stdout.toString().trim();
}
