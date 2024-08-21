import { makeCommand } from "@rnx-kit/tools-shell/command";
import type { BuildParams } from "./types.js";

export const open = makeCommand("open");

/**
 * Adds macOS specific build flags.
 */
export function macosSpecificBuildFlags(
  { platform, configuration }: BuildParams,
  args: string[]
): string[] {
  if (platform === "macos") {
    if (configuration !== "Release") {
      args.push("CODE_SIGNING_ALLOWED=NO");
    }
  }
  return args;
}
