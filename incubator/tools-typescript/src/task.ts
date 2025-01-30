import { BatchWriter } from "./files";
import { openProject } from "./host";
import { multiplexForPlatforms } from "./platforms";
import type { BuildContext, BuildOptions } from "./types";

/**
 * Execute the build for the given context
 * @param context information about this build
 */
export async function buildTask(context: BuildContext): Promise<boolean> {
  const { time, log, error, succeeded } = context.reporter;

  try {
    time(`Execute build}`, () => {
      // set up the project we will use for the build
      const project = openProject(context);

      const { build = [], check = [] } = context;
      log(
        `Building ${build.length} files, type-checking ${check.length} files`
      );

      // emit files that need to be built
      time(`emit: ${build.length} files`, () => {
        build.forEach((file) => project.emitFile(file));
      });

      // check files that need to be type-checked
      time(`validate: ${check.length} files`, () => {
        check.forEach((file) => project.validateFile(file));
      });
    });
  } catch (e) {
    error(e);
  }
  // return successfully only if there are no errors
  return succeeded(!!context.platform);
}

/**
 * Create the build tasks for the given build directive
 * @param context context with the basic options loaded
 * @returns one or more promises which can be waited on for build completion
 */
export function createBuildTasks(
  options: BuildOptions,
  context: BuildContext
): Promise<boolean>[] {
  const { asyncWrites, target } = options;
  const promises: Promise<boolean>[] = [];
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
