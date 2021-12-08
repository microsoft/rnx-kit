import {
  CyclicDependencies,
  PluginOptions as CyclicDetectorOptions,
} from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import {
  DuplicateDependencies,
  Options as DuplicateDetectorOptions,
} from "@rnx-kit/metro-plugin-duplicates-checker";
import { MetroPlugin, MetroSerializer } from "@rnx-kit/metro-serializer";
import {
  esbuildTransformerConfig,
  MetroSerializer as MetroSerializerEsbuild,
} from "@rnx-kit/metro-serializer-esbuild";
import { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { Project } from "@rnx-kit/typescript-service";

import { createProjectCache } from "./typescript/project-cache";
import type { TypeScriptValidationOptions } from "./types";

import type { DeltaResult, Graph } from "metro";
import type { InputConfigT, SerializerConfigT } from "metro-config";

/**
 * Create a hook function to be registered with Metro during serialization.
 * Each serialization pass runs the hook which type-checks each added/updated
 * source file.
 *
 * Source file in node_modules (external packages) are ignored.
 *
 * @param options TypeScript validation options
 * @returns Hook function
 */
function createSerializerHook(options: TypeScriptValidationOptions) {
  const projectCache = createProjectCache(options.print);

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

      //  Map each file to a TypeScript project, and apply its delta operation.
      const tsprojectsToValidate: Set<Project> = new Set();
      adds.concat(updates).forEach((sourceFile) => {
        const { tsproject, tssourceFiles } = projectCache.getProjectInfo(
          sourceFile,
          platform
        );
        if (tssourceFiles.has(sourceFile)) {
          tsproject.setFile(sourceFile);
          tsprojectsToValidate.add(tsproject);
        }
      });
      deletes.forEach((sourceFile) => {
        const { tsproject } = projectCache.getProjectInfo(sourceFile, platform);
        tsproject.removeFile(sourceFile);
        tsprojectsToValidate.add(tsproject);
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
 * @param detectCyclicDependencies When true, cyclic dependency checking is enabled with a default set of options. Otherwise the object allows for fine-grained control over the detection process.
 * @param detectDuplicateDependencies When true, duplicate dependency checking is enabled with a default set of options. Otherwise, the object allows for fine-grained control over the detection process.
 * @param typescriptValidation When true, TypeScript type-checking is enabled with a default set of options. Otherwise, the object allows for fine-grained control over the type-checking process.
 * @param experimental_treeShake When true, experimental tree-shaking is enabled.
 */
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  detectCyclicDependencies: boolean | CyclicDetectorOptions,
  detectDuplicateDependencies: boolean | DuplicateDetectorOptions,
  typescriptValidation: boolean | TypeScriptValidationOptions,
  experimental_treeShake: boolean
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

  if (experimental_treeShake) {
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
    hook = createSerializerHook(typescriptValidation);
  } else if (typescriptValidation !== false) {
    hook = createSerializerHook({});
  }
  metroConfig.serializer.experimentalSerializerHook = hook;
}
