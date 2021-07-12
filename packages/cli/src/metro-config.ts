import {
  CyclicDependencies,
  PluginOptions as CyclicDetectorOptions,
} from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import {
  DuplicateDependencies,
  Options as DuplicateDetectorOptions,
} from "@rnx-kit/metro-plugin-duplicates-checker";
import { MetroSerializer, MetroPlugin } from "@rnx-kit/metro-serializer";
import { MetroSerializer as MetroSerializerEsbuild } from "@rnx-kit/metro-serializer-esbuild";
import type { ConfigT, InputConfigT, SerializerConfigT } from "metro-config";

function reportError(prop: string) {
  console.error(
    "error: Metro configuration property '%o' should not be set. This command may overwrite it, based on command-line arguments or kit configuration.",
    prop
  );
}

//  Validate the Metro configuration. Make sure that any reserved
//  fields haven't been set by the app. We reserve certain fields
//  so that we can control them through configuration.
export function validateMetroConfig(metroConfig: ConfigT): boolean {
  if (metroConfig.serializer.customSerializer) {
    reportError("customSerializer");
    return false;
  }

  return true;
}

//  Customize the Metro configuration
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  detectCyclicDependencies: boolean | CyclicDetectorOptions,
  detectDuplicateDependencies: boolean | DuplicateDetectorOptions,
  experimental_treeShake: boolean
): void {
  //  We will be making changes to the Metro configuration. Coerce from a
  //  type with readonly props to a type where the props are writeable.
  const metroConfig = metroConfigReadonly as InputConfigT;

  const plugins: MetroPlugin[] = [];
  if (typeof detectDuplicateDependencies === "boolean") {
    plugins.push(DuplicateDependencies());
  } else if (typeof detectDuplicateDependencies === "object") {
    plugins.push(DuplicateDependencies(detectDuplicateDependencies));
  }
  if (typeof detectCyclicDependencies === "boolean") {
    plugins.push(CyclicDependencies());
  } else if (typeof detectCyclicDependencies === "object") {
    plugins.push(CyclicDependencies(detectCyclicDependencies));
  }

  if (plugins.length > 0) {
    //  MetroSerializer acts as a CustomSerializer, and it works with both
    //  older and newer versions of Metro. Older versions expect a return
    //  value, while newer versions expect a promise.
    //
    //  Its return type is the union of both the value and the promise.
    //  This makes TypeScript upset because for any given version of Metro,
    //  it's one or the other. Not both.
    //
    //  Since it can handle either scenario, just coerce it to whatever
    //  the current version of Metro expects.
    const serializer = experimental_treeShake
      ? MetroSerializerEsbuild(plugins)
      : (MetroSerializer(plugins) as SerializerConfigT["customSerializer"]);

    metroConfig.serializer.customSerializer = serializer;
  } else {
    delete metroConfig.serializer.customSerializer;
  }
}
