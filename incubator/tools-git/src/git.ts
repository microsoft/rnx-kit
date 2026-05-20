import { spawnSync } from "node:child_process";
import { styleText } from "node:util";

export const DEFAULT_BRANCH = "origin/main";

/**
 * Executes `git` with specified arguments.
 * @returns The output of the execution
 */
export function git(...args: string[]): string {
  const { stderr, stdout } = spawnSync("git", args);
  const message = stderr.toString().trim();
  if (message) {
    console.error(styleText(["red", "bold"], "error"), message);
  }
  return stdout.toString().trim();
}
