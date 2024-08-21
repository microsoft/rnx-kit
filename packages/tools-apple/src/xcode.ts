import { makeCommand, makeCommandSync } from "@rnx-kit/tools-shell/command";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { iosSpecificBuildFlags } from "./ios.js";
import { macosSpecificBuildFlags } from "./macos.js";
import { findSchemes } from "./scheme.js";
import type { BuildParams, JSObject } from "./types.js";

export const xcrun = makeCommand("xcrun");

function remoteSpecificBuildFlags(
  { isBuiltRemotely }: BuildParams,
  args: string[]
): string[] {
  if (isBuiltRemotely) {
    const NO_SANITIZE =
      "-fno-sanitize=undefined -fno-sanitize=bounds -fstack-protector-strong";
    args.push(
      "CLANG_ADDRESS_SANITIZER=NO",
      "CLANG_UNDEFINED_BEHAVIOR_SANITIZER=NO",
      `OTHER_CFLAGS=$(inherited) ${NO_SANITIZE}`,
      `OTHER_LDFLAGS=$(inherited) ${NO_SANITIZE}`
    );
  }
  return args;
}

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

/**
 * Builds the specified `.xcworkspace`.
 */
export function xcodebuild(
  xcworkspace: string,
  params: BuildParams,
  log = console.log
) {
  const args = ["-workspace", xcworkspace];

  const { scheme, configuration = "Debug" } = params;
  if (scheme) {
    args.push("-scheme", scheme);
  } else {
    const schemes = findSchemes(xcworkspace);
    if (schemes.length > 0) {
      if (schemes.length > 1) {
        const choices = schemes.join(", ");
        log(`Multiple schemes were found; picking the first one: ${choices}`);
        log("If this is wrong, specify another scheme with `--scheme`");
      }
      args.push("-scheme", schemes[0]);
    } else {
      log("No schemes were found; leaving it to Xcode to figure things out");
      log("If this is wrong, specify another scheme with `--scheme`");
    }
  }

  args.push(
    "-configuration",
    configuration,
    "-derivedDataPath",
    path.join(path.dirname(xcworkspace), "DerivedData")
  );

  iosSpecificBuildFlags(params, args);
  macosSpecificBuildFlags(params, args);
  remoteSpecificBuildFlags(params, args);

  args.push("COMPILER_INDEX_STORE_ENABLE=NO", "build");

  return spawn("xcodebuild", args);
}
