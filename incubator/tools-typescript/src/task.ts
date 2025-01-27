import {
  type AllPlatforms,
  getModuleSuffixes,
} from "@rnx-kit/tools-react-native";
import { Service } from "@rnx-kit/typescript-service";
import { BatchWriter } from "./files";
import { createHostEnhancer } from "./host";
import { multiplexForPlatforms } from "./platforms";
import type { BuildContext } from "./types";

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
  context: BuildContext,
  options: BuildTaskOptions
) {
  const { platform, writer } = options;
  const { time, log } = context;
  let { cmdLine } = context;

  // log the platform we are building for

  // add module suffixes to options if platform is set
  const moduleSuffixes = platform && getModuleSuffixes(platform);
  if (moduleSuffixes) {
    cmdLine = { ...cmdLine, options: { ...cmdLine.options, moduleSuffixes } };
  }

  time(`build platform: ${platform ?? "none"}`, () => {
    // set up the project we will use for the build
    const project = service.openProject(
      cmdLine,
      createHostEnhancer({ platform, writer })
    );

    // figure out the what files we are building and type-checking
    const noEmit = cmdLine.options.noEmit;
    const build = options.build || noEmit ? [] : cmdLine.fileNames;
    const check = options.check || noEmit ? cmdLine.fileNames : [];
    log(
      `Build task: platform: ${platform ?? "none"} (build:${build.length}, check:${check.length})`
    );

    // emit files that need to be built
    time(`emit ${build.length} files, platform: ${platform}`, () => {
      build.forEach((file) => project.emitFile(file));
    });

    // check files that need to be type-checked
    time(`validate ${check.length} files, platform: ${platform}`, () => {
      check.forEach((file) => project.validateFile(file));
    });
  });
}

export function createBuildTasks(context: BuildContext): Promise<void>[] {
  const { asyncWrites, noTypecheck, platforms, cmdLine, target } = context;
  const promises: Promise<void>[] = [];
  const writer = asyncWrites ? new BatchWriter(target!) : undefined;

  if (noTypecheck) {
    // this forces the build to only emit files, it also disables multiplexing across platforms
    promises.push(buildTask(context, { writer, build: cmdLine.fileNames }));
  } else {
    const base: BuildTaskOptions = { writer };
    const tasks = multiplexForPlatforms(
      cmdLine.fileNames,
      base,
      !!cmdLine.options.noEmit,
      platforms
    );
    tasks.forEach((task) => promises.push(buildTask(context, task)));
  }

  if (writer) {
    promises.push(writer.finish());
  }
  return promises;
}
