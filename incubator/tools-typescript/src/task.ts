import { createAsyncWriter } from "./files.ts";
import { openProject } from "./host.ts";
import { multiplexForPlatforms } from "./platforms.ts";
import type { BuildContext, BuildOptions, PlatformInfo } from "./types.ts";

/**
 * Execute the build for the given context
 * @param context information about this build
 */
export async function buildTask(context: BuildContext) {
  const reporter = context.reporter;

  reporter.time(`Finished build`, () => {
    // set up the project we will use for the build
    const project = openProject(context);

    const { build = [], check = [] } = context;
    reporter.log(
      `Building ${build.length} files, type-checking ${check.length} files`
    );

    // emit files that need to be built
    if (build.length > 0) {
      reporter.time(`emit: ${build.length} files`, () => {
        for (const file of build) {
          if (!project.emitFile(file)) {
            reporter.error(`unable to build ${file}`);
          }
        }
      });
    }

    // check files that need to be type-checked
    if (check.length > 0) {
      reporter.time(`validate: ${check.length} files`, () => {
        for (const file of check) {
          if (!project.validateFile(file)) {
            reporter.error(`type errors in ${file}`);
          }
        }
      });
    }
  });

  reporter.report();
  if (reporter.errors() > 0) {
    throw new Error("Build failed");
  }
}

/**
 * Create the build tasks for the given build directive
 * @param context context with the basic options loaded
 * @returns one or more promises which can be waited on for build completion
 */
export function createBuildTasks(
  options: BuildOptions,
  context: BuildContext,
  platforms?: PlatformInfo[]
): Promise<void>[] {
  const { asyncWrites, target } = options;
  if (asyncWrites) {
    context.writer = createAsyncWriter(target!);
  }

  const tasks = multiplexForPlatforms(context, platforms);
  const promises = tasks.map((taskContext) => buildTask(taskContext));

  if (context.writer) {
    promises.push(context.writer.finish());
  }
  return promises;
}
