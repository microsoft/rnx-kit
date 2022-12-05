import type { BundlerPlugins } from "@rnx-kit/config";
import { CyclicDependencies } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import { DuplicateDependencies } from "@rnx-kit/metro-plugin-duplicates-checker";
import { TypeScriptPlugin } from "@rnx-kit/metro-plugin-typescript";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { MetroSerializer } from "@rnx-kit/metro-serializer";
import {
  esbuildTransformerConfig,
  MetroSerializer as MetroSerializerEsbuild,
} from "@rnx-kit/metro-serializer-esbuild";
import type { InputConfigT, SerializerConfigT } from "metro-config";

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

  const hook = TypeScriptPlugin(typescriptValidation, print);
  metroConfig.serializer.experimentalSerializerHook = hook;
}
