import type { TypeScriptValidationOptions } from "@rnx-kit/config";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type { Project } from "@rnx-kit/typescript-service";
import { createProjectCache } from "./projectCache";
import type { SerializerHook } from "./types";

/**
 * Create a hook function to be registered with Metro during serialization.
 * Each serialization pass runs the hook which type-checks each added/updated
 * source file.
 *
 * Source file in node_modules (external packages) are ignored.
 *
 * @param options TypeScript validation options
 * @param print Optional function to use when printing status messages to the Metro console
 * @returns Hook function
 */
export function TypeScriptPlugin(
  options?: TypeScriptValidationOptions | boolean,
  print?: (message: string) => void
): SerializerHook {
  if (options === false) {
    return () => void 0;
  }

  const projectCache = createProjectCache(print);

  const patternNodeModules = /[/\\]node_modules[/\\]/;
  const excludeNodeModules = (p: string) => !patternNodeModules.test(p);
  const throwOnError = typeof options === "object" && options.throwOnError;

  return (graph, delta) => {
    const platform = graph.transformOptions.platform as AllPlatforms;
    if (platform) {
      if (delta.reset) {
        // Metro is signaling that all cached data for this Graph should be
        // thrown out. Each Graph is scoped to one platform, so discard all
        // of that platform's projects.
        projectCache.clearPlatform(platform);
      }

      // Filter adds, updates, and deletes coming from Metro. Do not look at
      // anything in an external package (e.g. under node_modules).
      const adds = Array.from(
        delta.added.values(),
        (module) => module.path
      ).filter(excludeNodeModules);

      const updates = Array.from(
        delta.modified.values(),
        (module) => module.path
      ).filter(excludeNodeModules);

      const deletes = Array.from(delta.deleted.values()).filter(
        excludeNodeModules
      );

      // Try to map each file to a TypeScript project, and apply its delta operation.
      // Some projects may not actually be TypeScript projects (ignore those).
      const tsprojectsToValidate = new Set<Project>();
      for (const sourceFile of adds.concat(updates)) {
        const projectInfo = projectCache.getProjectInfo(sourceFile, platform);
        if (projectInfo) {
          // This is a TypeScript project. Validate it.
          const { tsproject, tssourceFiles } = projectInfo;
          if (tssourceFiles.has(sourceFile)) {
            tsproject.setFile(sourceFile);
            tsprojectsToValidate.add(tsproject);
          }
        }
      }

      for (const sourceFile of deletes) {
        const projectInfo = projectCache.getProjectInfo(sourceFile, platform);
        if (projectInfo) {
          // This is a TypeScript project. Validate it.
          const { tsproject } = projectInfo;
          tsproject.removeFile(sourceFile);
          tsprojectsToValidate.add(tsproject);
        }
      }

      // Validate all projects which changed, printing all type errors.
      let errors = 0;
      tsprojectsToValidate.forEach((p) => {
        if (!p.validate()) {
          errors += 1;
        }
      });

      if (errors > 0 && throwOnError) {
        // Type-checking failed. Fail the Metro operation (bundling or serving).
        throw new Error(`Found errors in ${errors} project(s)`);
      }
    }
  };
}
