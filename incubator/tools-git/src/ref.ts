import { spawnSync } from "node:child_process";

/**
 * Returns whether the specified reference name is valid.
 * @param ref The reference name to validate
 */
export function verifyRef(ref: string): boolean {
  const checkRefFormat = ["check-ref-format", "--allow-onelevel", ref];
  const { status } = spawnSync("git", checkRefFormat);
  return status === 0;
}
