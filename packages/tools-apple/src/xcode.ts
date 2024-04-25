import { makeCommand, makeCommandSync } from "@rnx-kit/tools-shell/command";
import * as path from "path";
import type { JSObject } from "./types.js";

export const xcrun = makeCommand("xcrun");

/**
 * Returns the path to the active developer directory.
 */
export function getDeveloperDirectory(): string | undefined {
  const xcodeSelect = makeCommandSync("xcode-select");

  const { stdout, status } = xcodeSelect("--print-path");
  return status === 0 ? stdout.trim() : undefined;
}

/**
 * Parses and returns the information property list of specified bundle.
 */
export async function parsePlist(app: string): Promise<Error | JSObject> {
  const plutil = makeCommand("plutil");

  const infoPlist = path.join(app, "Info.plist");
  const convertPlist = plutil("-convert", "json", "-o", "-", infoPlist);
  const { stdout, status } = await convertPlist;
  return status === 0
    ? JSON.parse(stdout)
    : new Error(`Failed to parse 'Info.plist' of '${app}'`);
}
