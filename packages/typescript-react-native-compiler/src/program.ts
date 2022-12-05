import { changeHostToUseReactNativeResolver } from "@rnx-kit/typescript-react-native-resolver";
import ts from "typescript";
import { changeModuleResolutionHostToUseReadCache } from "./cache";

import type { CommandLine } from "./command-line";

function configureCompilerHost(
  compilerHost: ts.CompilerHost,
  cmdLine: CommandLine
): void {
  const {
    platform,
    platformExtensions,
    disableReactNativePackageSubstitution,
  } = cmdLine.rnts;

  changeModuleResolutionHostToUseReadCache(compilerHost);

  if (platform) {
    //  A react-native target platform was specified. Use the react-native
    //  TypeScript resolver.
    //
    changeHostToUseReactNativeResolver({
      host: compilerHost,
      options: cmdLine.ts.options,
      platform,
      platformExtensionNames: platformExtensions,
      disableReactNativePackageSubstitution:
        !!disableReactNativePackageSubstitution,
    });
  }
}

function getProgramOptions(
  cmdLine: CommandLine,
  host: ts.CompilerHost
): ts.CreateProgramOptions {
  return {
    rootNames: cmdLine.ts.fileNames,
    options: cmdLine.ts.options,
    projectReferences: cmdLine.ts.projectReferences,
    host,
    configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(
      cmdLine.ts
    ),
  };
}

/**
 * Create a TypeScript program object using the given command line.
 *
 * If a react-native platform appears on the command-line, the program will
 * use a react-native module resolver which can handle platform extensions
 * such as ".ios.ts" and ".native.tsx". Otherwise, the program will use the
 * standard TypeScript module resolver.
 *
 * @param cmdLine Command line
 * @returns TypeScript program
 */
export function createProgram(cmdLine: CommandLine): ts.Program {
  const host = ts.createCompilerHost(cmdLine.ts.options);

  configureCompilerHost(host, cmdLine);

  const program = ts.createProgram(getProgramOptions(cmdLine, host));
  return program;
}

/**
 * Create a TypeScript incremental program using the given command line.
 *
 * If a react-native platform appears on the command-line, the program will
 * use a react-native module resolver which can handle platform extensions
 * such as ".ios.ts" and ".native.tsx". Otherwise, the program will use the
 * standard TypeScript module resolver.
 *
 * @param cmdLine Command line
 * @returns TypeScript incremental program
 */
export function createIncrementalProgram(
  cmdLine: CommandLine
): ts.EmitAndSemanticDiagnosticsBuilderProgram {
  const host = ts.createIncrementalCompilerHost(cmdLine.ts.options);

  configureCompilerHost(host, cmdLine);

  const program = ts.createIncrementalProgram(getProgramOptions(cmdLine, host));
  return program;
}
