import type {
  BundlerPlugins,
  TypeScriptValidationOptions,
} from "@rnx-kit/config";
import { CyclicDependencies } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import { DuplicateDependencies } from "@rnx-kit/metro-plugin-duplicates-checker";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { MetroSerializer } from "@rnx-kit/metro-serializer";
import {
  esbuildTransformerConfig,
  MetroSerializer as MetroSerializerEsbuild,
} from "@rnx-kit/metro-serializer-esbuild";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type { Project } from "@rnx-kit/typescript-service";
import type { DeltaResult, Graph } from "metro";
import type { InputConfigT, SerializerConfigT } from "metro-config";
import { createProjectCache } from "./typescript/project-cache";

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
function createSerializerHook(
  options: TypeScriptValidationOptions,
  print?: (message: string) => void
) {
  const projectCache = createProjectCache(print);

  const patternNodeModules = /[/\\]node_modules[/\\]/;
  const excludeNodeModules = (p: string) => !patternNodeModules.test(p);

  const hook = (graph: Graph, delta: DeltaResult): void => {
    const platform = graph.transformOptions.platform as AllPlatforms;
    if (platform) {
      if (delta.reset) {
        //  Metro is signaling that all cached data for this Graph should be
        //  thrown out. Each Graph is scoped to one platform, so discard all
        //  of that platform's projects.
        projectCache.clearPlatform(platform);
      }

      //  Filter adds, updates, and deletes coming from Metro. Do not look at
      //  anything in an external package (e.g. under node_modules).
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

      //  Try to map each file to a TypeScript project, and apply its delta operation.
      //  Some projects may not actually be TypeScript projects (ignore those).
      const tsprojectsToValidate: Set<Project> = new Set();
      adds.concat(updates).forEach((sourceFile) => {
        const projectInfo = projectCache.getProjectInfo(sourceFile, platform);
        if (projectInfo) {
          // This is a TypeScript project. Validate it.
          const { tsproject, tssourceFiles } = projectInfo;
          if (tssourceFiles.has(sourceFile)) {
            tsproject.setFile(sourceFile);
            tsprojectsToValidate.add(tsproject);
          }
        }
      });
      deletes.forEach((sourceFile) => {
        const projectInfo = projectCache.getProjectInfo(sourceFile, platform);
        if (projectInfo) {
          // This is a TypeScript project. Validate it.
          const { tsproject } = projectInfo;
          tsproject.removeFile(sourceFile);
          tsprojectsToValidate.add(tsproject);
        }
      });

      //  Validate all projects which changed, printing all type errors.
      let isValid = true;
      tsprojectsToValidate.forEach((p) => {
        if (!p.validate()) {
          isValid = false;
        }
      });

      if (!isValid && options.throwOnError) {
        // Type-checking failed. Fail the Metro operation (bundling or serving).
        throw new Error("Type validation failed");
      }
    }
  };

  return hook;
}

const emptySerializerHook = (_graph: Graph, _delta: DeltaResult): void => {
  // nop
};

/**
 * Customize the Metro configuration.
 *
 * @param metroConfigReadonly Metro configuration
 * @param bundlerPlugins Plugins used to further customize Metro configuration
 * @param print Optional function to use when printing status messages to the Metro console
 */
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  {
    detectCyclicDependencies,
    detectDuplicateDependencies,
    treeShake,
    typescriptValidation,
  }: BundlerPlugins,
  print?: (message: string) => void
): void {
  //  We will be making changes to the Metro configuration. Coerce from a
  //  type with readonly props to a type where the props are writeable.
  const metroConfig = metroConfigReadonly as InputConfigT;

  const plugins: MetroPlugin[] = [];
  if (typeof detectDuplicateDependencies === "object") {
    plugins.push(DuplicateDependencies(detectDuplicateDependencies));
  } else if (detectDuplicateDependencies !== false) {
    plugins.push(DuplicateDependencies());
  }
  if (typeof detectCyclicDependencies === "object") {
    plugins.push(CyclicDependencies(detectCyclicDependencies));
  } else if (detectCyclicDependencies !== false) {
    plugins.push(CyclicDependencies());
  }

  if (treeShake) {
    metroConfig.serializer.customSerializer = MetroSerializerEsbuild(plugins);
    Object.assign(metroConfig.transformer, esbuildTransformerConfig);
  } else if (plugins.length > 0) {
    // MetroSerializer acts as a CustomSerializer, and it works with both
    // older and newer versions of Metro. Older versions expect a return
    // value, while newer versions expect a promise.
    //
    // Its return type is the union of both the value and the promise.
    // This makes TypeScript upset because for any given version of Metro,
    // it's one or the other. Not both.
    //
    // Since it can handle either scenario, just coerce it to whatever
    // the current version of Metro expects.
    metroConfig.serializer.customSerializer = MetroSerializer(
      plugins
    ) as SerializerConfigT["customSerializer"];
  } else {
    delete metroConfig.serializer.customSerializer;
  }

  let hook = emptySerializerHook;
  if (typeof typescriptValidation === "object") {
    hook = createSerializerHook(typescriptValidation, print);
  } else if (typescriptValidation !== false) {
    hook = createSerializerHook({}, print);
  }
  metroConfig.serializer.experimentalSerializerHook = hook;
}
