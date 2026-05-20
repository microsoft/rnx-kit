import { error } from "@rnx-kit/console";
import { spawnSync } from "node:child_process";

export const DEFAULT_BRANCH = "origin/main";

/**
 * Executes `git` with specified arguments.
 * @returns The output of the execution
 */
export function git(...args: string[]): string {
  const { stderr, stdout } = spawnSync("git", args);
  const message = stderr.toString().trim();
  if (message) {
    error(message);
  }
  return stdout.toString().trim();
}
