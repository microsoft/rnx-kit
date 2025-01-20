import {
  type AllPlatforms,
  getModuleSuffixes,
} from "@rnx-kit/tools-react-native";
import { Service } from "@rnx-kit/typescript-service";
import type ts from "typescript";
import { BatchWriter } from "./files";
import { createHostEnhancer } from "./host";
import { multiplexForPlatforms } from "./platforms";
import type { Tracer } from "./tracer";
import type { ToolCmdLineOptions } from "./types";

// wrap all running commands in a single service
const service = new Service();

export type BuildTaskOptions = {
  // platform for this build
  platform?: AllPlatforms;

  // override files to only build the specified files
  build?: string[];

  // override files to only type-check the specified files
  check?: string[];

  // optional async file writer to write the files for this build
  writer?: BatchWriter;
};

export async function buildTask(
  cmdLine: ts.ParsedCommandLine,
  options: BuildTaskOptions,
  tracer: Tracer
) {
  const { platform, writer } = options;

  // add module suffixes to options if platform is set
  const moduleSuffixes = platform && getModuleSuffixes(platform);
  if (moduleSuffixes) {
    cmdLine = { ...cmdLine, options: { ...cmdLine.options, moduleSuffixes } };
  }

  // set up the project we will use for the build
  const project = service.openProject(
    cmdLine,
    createHostEnhancer({ platform, writer })
  );

  const noEmit = cmdLine.options.noEmit;

  // figure out the list of files to build and run through them
  const build = options.build || noEmit ? [] : cmdLine.fileNames;
  tracer.time(`emit ${build.length} files: ${platform}`, () => {
    build.forEach((file) => project.emitFile(file));
  });

  // figure out the list of files to type-check and run through them
  const check = options.check || noEmit ? cmdLine.fileNames : [];
  tracer.time(`validate ${check.length} files: ${platform}`, () => {
    check.forEach((file) => project.validateFile(file));
  });
}

export function createBuildTasks(
  cmdLine: ts.ParsedCommandLine,
  options: ToolCmdLineOptions,
  tracer: Tracer
): Promise<void>[] {
  const { asyncWrites, noTypecheck, platforms } = options;
  const promises: Promise<void>[] = [];
  const writer = asyncWrites ? new BatchWriter() : undefined;

  if (noTypecheck) {
    // this forces the build to only emit files, it also disables multiplexing across platforms
    promises.push(
      buildTask(cmdLine, { writer, build: cmdLine.fileNames }, tracer)
    );
  } else {
    const base: BuildTaskOptions = { writer };
    const tasks = multiplexForPlatforms(
      cmdLine.fileNames,
      base,
      !!cmdLine.options.noEmit,
      platforms
    );
    tasks.forEach((task) => promises.push(buildTask(cmdLine, task, tracer)));
  }

  if (writer) {
    promises.push(writer.finish());
  }
  return promises;
}
