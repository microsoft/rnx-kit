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
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { changeHostToUseReactNativeResolver } from "@rnx-kit/typescript-react-native-resolver";
import {
  Project,
  readConfigFile,
  createDiagnosticWriter,
} from "@rnx-kit/typescript-service";
import type { DeltaResult, Graph } from "metro";
import type { InputConfigT, SerializerConfigT } from "metro-config";
import type { LanguageServiceHost } from "typescript";

import type { TSProjectInfo } from "./types";

function createSerializerHook({ service, configFileName }: TSProjectInfo) {
  const tsprojectByPlatform: Map<AllPlatforms, Project> = new Map();

  function resetProject(platform: AllPlatforms): void {
    const tsproject = tsprojectByPlatform.get(platform);
    if (tsproject) {
      tsproject.dispose();
      tsprojectByPlatform.delete(platform);
    }
  }

  function getProject(platform: AllPlatforms): Project {
    let tsproject = tsprojectByPlatform.get(platform);
    if (!tsproject) {
      // start with an empty project, ignoring the file graph provided by tsconfig.json
      const cmdLine = readConfigFile(configFileName);
      if (!cmdLine) {
        throw new Error(`Failed to load '${configFileName}'`);
      } else if (cmdLine.errors.length > 0) {
        const writer = createDiagnosticWriter();
        cmdLine.errors.forEach((e) => writer.print(e));
        throw new Error(`Failed to load '${configFileName}'`);
      }

      const enhanceLanguageServiceHost = (host: LanguageServiceHost): void => {
        const platformExtensionNames =
          platform === "windows" || platform === "win32"
            ? ["win", "native"]
            : ["native"];
        const disableReactNativePackageSubstitution = true;
        const traceReactNativeModuleResolutionErrors = false;
        const traceResolutionLog = undefined;
        changeHostToUseReactNativeResolver({
          host,
          options: cmdLine.options,
          platform,
          platformExtensionNames,
          disableReactNativePackageSubstitution,
          traceReactNativeModuleResolutionErrors,
          traceResolutionLog,
        });
      };

      tsproject = service.openProject(cmdLine, enhanceLanguageServiceHost);
      tsproject.removeAllFiles();

      tsprojectByPlatform.set(platform, tsproject);
    }
    return tsproject;
  }

  const hook = (graph: Graph, delta: DeltaResult): void => {
    const platform = graph.transformOptions.platform as AllPlatforms;
    if (platform) {
      if (delta.reset) {
        resetProject(platform);
      }

      const tsproject = getProject(platform);

      //  Apply delta change changes to the TypeScript project. New files are
      //  added to the project file list. Updated files have their cached
      //  snapshot cleared, causing the file to be reloaded. Deleted files
      //  are removed from the project file list.
      for (const module of delta.added.values()) {
        tsproject.setFile(module.path);
      }
      for (const module of delta.modified.values()) {
        tsproject.setFile(module.path);
      }
      for (const module of delta.deleted.values()) {
        tsproject.removeFile(module);
      }

      tsproject.validate();
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
 * @param tsprojectInfo When set, TypeScript validation is enabled during bundling and serving.
 * @param experimental_treeShake When true, experimental tree-shaking is enabled.
 */
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  detectCyclicDependencies: boolean | CyclicDetectorOptions,
  detectDuplicateDependencies: boolean | DuplicateDetectorOptions,
  tsprojectInfo: TSProjectInfo | undefined,
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

  metroConfig.serializer.experimentalSerializerHook = tsprojectInfo
    ? createSerializerHook(tsprojectInfo)
    : emptySerializerHook;
}
