import fs from "fs";
import { builtinModules } from "module";
import os from "os";
import path from "path";
import ts from "typescript";
import util from "util";

import type { ModuleResolutionHostLike } from "./types";

export const enum ResolverLogMode {
  Never,
  Always,
  OnFailure,
}

export class ResolverLog {
  private mode: ResolverLogMode;
  private buffering: boolean;
  private messages: string[];
  private logFile: string | undefined;

  constructor(mode: ResolverLogMode, logFile?: string) {
    this.mode = mode;
    this.buffering = false;
    this.messages = [];
    this.logFile = logFile;
  }

  getMode(): ResolverLogMode {
    return this.mode;
  }

  begin(): void {
    this.buffering = true;
  }

  log(format: string, ...args: string[]): void {
    if (this.mode !== ResolverLogMode.Never && this.buffering) {
      this.messages.push(util.format(format, ...args));
    }
  }

  endSuccess(): void {
    if (this.mode === ResolverLogMode.Always) {
      this.flush();
    }
    this.reset();
  }

  endFailure(): void {
    if (
      this.mode === ResolverLogMode.OnFailure ||
      this.mode === ResolverLogMode.Always
    ) {
      this.flush();
    }
    this.reset();
  }

  reset(): void {
    if (this.mode !== ResolverLogMode.Never) {
      this.messages = [];
    }
    this.buffering = false;
  }

  private flush(): void {
    if (this.messages.length > 0) {
      const messages = this.messages.join(os.EOL);
      if (this.logFile) {
        fs.writeFileSync(this.logFile, messages + os.EOL, {
          encoding: "utf-8",
          flag: "a",
        });
      } else {
        console.log(messages);
      }
    }
  }
}

/**
 * Wrap a module resolution host's methods which read from the file system,
 * adding logging to each one.
 *
 * @param host Module resolution host
 * @param resolverLog Log
 */
export function changeModuleResolutionHostToLogFileSystemReads(
  host: ModuleResolutionHostLike
): void {
  const originalFileExists = host.fileExists;
  const originalReadFile = host.readFile;
  const originalDirectoryExists = host.directoryExists;
  const originalRealpath = host.realpath;
  const originalGetDirectories = host.getDirectories;

  host.fileExists = (fileName: string): boolean => {
    const result = originalFileExists(fileName);
    if (!result && host.trace) {
      host.trace(`File '${fileName}' does not exist.`);
    }
    return result;
  };

  host.readFile = (fileName: string): string | undefined => {
    const result = originalReadFile(fileName);
    if (host.trace) {
      if (result) {
        host.trace(`Read file '${fileName}'.`);
      } else {
        host.trace(`File '${fileName}' cannot be read.`);
      }
    }
    return result;
  };

  host.directoryExists = (directoryName: string): boolean => {
    const result = originalDirectoryExists(directoryName);
    if (!result && host.trace) {
      host.trace(`Directory '${directoryName}' does not exist.`);
    }
    return result;
  };

  if (originalRealpath) {
    host.realpath = (path: string): string => {
      const result = originalRealpath(path);
      if (result && host.trace) {
        host.trace(`Real path of '${path}' is '${result}'.`);
      }
      return result;
    };
  }

  host.getDirectories = (path: string): string[] => {
    const result = originalGetDirectories(path);
    if (host.trace) {
      const len = result ? result.length.toString() : "0";
      const suffix = result && result.length === 1 ? "y" : "ies";
      host.trace(`Found ${len} director${suffix} under '${path}'.`);
    }
    return result;
  };
}

/**
 * Decide whether or not to log failure information for the named module.
 *
 * @param options TypeScript compiler options
 * @param moduleName Module
 */
export function shouldLogResolverFailure(
  options: ts.ParsedCommandLine["options"],
  moduleName: string
): boolean {
  // ignore resolver errors for built-in node modules
  if (
    builtinModules.indexOf(moduleName) !== -1 ||
    moduleName === "fs/promises" || // doesn't show up in the list, but it's a built-in
    moduleName.toLowerCase().startsWith("node:") // explicit use of a built-in
  ) {
    return false;
  }

  // ignore JSON module failures when TypeScript is configured to ignore them
  if (!options.resolveJsonModule) {
    if (path.extname(moduleName).match(/\.json$/i)) {
      return false;
    }
  }

  // ignore resolver errors for multimedia files
  const multimediaExts =
    /\.(aac|aiff|bmp|caf|gif|html|jpeg|jpg|m4a|m4v|mov|mp3|mp4|mpeg|mpg|obj|otf|pdf|png|psd|svg|ttf|wav|webm|webp)$/i;
  if (path.extname(moduleName).match(multimediaExts)) {
    return false;
  }

  // ignore resolver errors for code files
  const codeExts = /\.(css)$/i;
  if (path.extname(moduleName).match(codeExts)) {
    return false;
  }

  return true;
}

/**
 * Start a logging session for resolving a single module.
 *
 * @param log Resolver log
 * @param moduleName Module name
 * @param containingFile File from which the module was required/imported.
 */
export function logModuleBegin(
  log: ResolverLog,
  moduleName: string,
  containingFile: string
): void {
  log.begin();
  log.log(
    "======== Resolving module '%s' from '%s' ========",
    moduleName,
    containingFile
  );
}

/**
 * End a logging session for resolving a single module.
 *
 * @param log Resolver log
 * @param options TypeScript compiler options
 * @param moduleName Module name
 * @param module Module resolution info, or `undefined` if resolution failed.
 */
export function logModuleEnd(
  log: ResolverLog,
  options: ts.ParsedCommandLine["options"],
  moduleName: string,
  module: ts.ResolvedModuleFull | undefined
): void {
  if (module) {
    log.log(
      "File '%s' exists - using it as a module resolution result.",
      module.resolvedFileName
    );
    log.log(
      "======== Module name '%s' was successfully resolved to '%s' ========",
      moduleName,
      module.resolvedFileName
    );
    log.endSuccess();
  } else {
    log.log("Failed to resolve module %s to a file.", moduleName);
    log.log(
      "======== Module name '%s' failed to resolve to a file ========",
      moduleName
    );
    if (
      log.getMode() !== ResolverLogMode.Never &&
      shouldLogResolverFailure(options, moduleName)
    ) {
      log.endFailure();
    } else {
      log.reset();
    }
  }
}
