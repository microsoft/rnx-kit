import { isDirectory, isFile } from "@rnx-kit/tools-node";
import { findConfigFile, readConfigFile } from "@rnx-kit/typescript-service";
import path from "path";
import ts from "typescript";

import type { CommandLine } from "./command-line";

/**
 * Resolve a project configuration path to a file, ensuring that the file
 * exists.
 *
 * The path can point to a specific file, or to a directory containing a
 * `tsconfig.json` file.
 *
 * @param project Project configuration path
 * @returns Path to the resolved configuration file
 */
export function resolveConfigFile(project: string): string {
  const fileOrDirectory = path.normalize(project);
  if (!fileOrDirectory || isDirectory(fileOrDirectory)) {
    const projectFile = path.join(fileOrDirectory, "tsconfig.json");
    if (!isFile(projectFile)) {
      throw new Error(
        `Cannot find a tsconfig.json file at the specified directory: ${project}`
      );
    }
    return projectFile;
  }

  if (!isFile(fileOrDirectory)) {
    throw new Error(`The specified path does not exist: ${project}`);
  }
  return fileOrDirectory;
}

/**
 * Ensure that the TypeScript command line contains either a valid project
 * configuration, or a set of source files. It cannot contain both.
 *
 * @param cmdLineTs TypeScript command line
 * @returns Path to the configuration file, or `undefined` if source files were used instead.
 */
export function ensureConfigFileOrSourceFiles(
  cmdLineTs: ts.ParsedCommandLine
): string | undefined {
  let configFileName: string | undefined = undefined;

  if (cmdLineTs.options.project) {
    //  A configuration file was given. Make sure no individual files were
    //  specified (these concepts are mutually exclusive).
    //
    if (cmdLineTs.fileNames.length !== 0) {
      throw new Error(
        "Cannot use a TypeScript configuration file and individually named source files together on the command-line"
      );
    }
    configFileName = resolveConfigFile(cmdLineTs.options.project);
  } else if (cmdLineTs.fileNames.length === 0) {
    //  A configuration file was not given, and neither were any individual
    //  files. Search for a configuration file.
    //
    configFileName = findConfigFile(process.cwd());
  }

  //  At this point, we should have either a configuration file or individual
  //  files.
  //
  if (cmdLineTs.fileNames.length === 0 && !configFileName) {
    throw new Error(
      "The command-line must include either a TypeScript configuration file or individually named source files"
    );
  }

  return configFileName;
}

/**
 * Try to read a TypeScript configuration file, if one was specified on the
 * command-line.
 *
 * @param cmdLine Command line
 * @returns TypeScript configuration file contents, or `undefined` if a config file was not read.
 */
export function tryReadTsConfigFile(
  cmdLine: CommandLine
): ts.ParsedCommandLine | undefined {
  const configFileName = ensureConfigFileOrSourceFiles(cmdLine.ts);

  if (configFileName) {
    const parsedConfig = readConfigFile(
      configFileName,
      cmdLine.ts.options,
      cmdLine.ts.watchOptions
    );

    return parsedConfig;
  }

  return undefined;
}
