import { Service } from "@rnx-kit/typescript-service";
import { BatchWriter } from "./files";
import { createHostEnhancer } from "./host";
import { multiplexForPlatforms } from "./platforms";
import type { BuildContext } from "./types";

// wrap all running commands in a single service
const serviceCache: Record<string, Service> = {};

function getService(platform?: string): Service {
  platform = platform || "none";
  if (!serviceCache[platform]) {
    serviceCache[platform] = new Service();
  }
  return serviceCache[platform];
}

/**
 * Execute the build for the given context
 * @param context information about this build
 */
export async function buildTask(context: BuildContext) {
  const { cmdLine, platform, writer, time, log } = context;

  // add module suffixes to options if platform is set
  const moduleSuffixes =
    platform &&
    context.platformInfo[platform].suffixes.map((suffix) => `.${suffix}`);
  if (moduleSuffixes) {
    cmdLine.options.moduleSuffixes = moduleSuffixes;
  }

  time(`build platform: ${platform ?? "none"}`, () => {
    // set up the project we will use for the build
    const project = getService(platform).openProject(
      cmdLine,
      createHostEnhancer({ platform, writer })
    );

    // figure out the what files we are building and type-checking
    const noEmit = cmdLine.options.noEmit;
    const build = context.build || noEmit ? [] : cmdLine.fileNames;
    const check = context.check || noEmit ? cmdLine.fileNames : [];
    log(
      `Build task: platform: ${platform ?? "none"} (build:${build.length}, check:${check.length}), suffixes: `,
      cmdLine.options.moduleSuffixes
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

/**
 * Create the build tasks for the given build directive
 * @param context context with the basic options loaded
 * @returns one or more promises which can be waited on for build completion
 */
export function createBuildTasks(context: BuildContext): Promise<void>[] {
  const { asyncWrites, target } = context;
  const promises: Promise<void>[] = [];
  if (asyncWrites) {
    context.writer = new BatchWriter(target!);
  }

  const tasks = multiplexForPlatforms(context);
  tasks.forEach((taskContext) => promises.push(buildTask(taskContext)));

  if (context.writer) {
    promises.push(context.writer.finish());
  }
  return promises;
}
