import type { BundlerPlugins } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
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
import { getDefaultBundlerPlugins } from "./bundle/defaultPlugins";

function resolvePlugin(name: string): string {
  try {
    return require.resolve(name);
  } catch (_) {
    return require.resolve(name, { paths: [process.cwd()] });
  }
}

function importPlugin(name: string) {
  const plugin = require(resolvePlugin(name));
  return plugin.default || plugin;
}

/**
 * Customize the Metro configuration.
 *
 * @param metroConfigReadonly Metro configuration
 * @param bundlerPlugins Plugins used to further customize Metro configuration
 * @param print Optional function to use when printing status messages to the Metro console
 */
export function customizeMetroConfig(
  metroConfigReadonly: InputConfigT,
  bundlerPlugins: BundlerPlugins,
  print?: (message: string) => void
): void {
  // We will be making changes to the Metro configuration. Coerce from a type
  // with readonly props to a type where the props are writeable.
  const metroConfig = metroConfigReadonly as InputConfigT;

  const metroPlugins: MetroPlugin[] = [];
  const serializerHooks: Record<
    string,
    SerializerConfigT["experimentalSerializerHook"]
  > = {};

  const oldOptions = [
    "detectCyclicDependencies",
    "detectDuplicateDependencies",
    "typescriptValidation",
  ];
  if (oldOptions.some((option) => option in bundlerPlugins)) {
    const deprecatedOptions = oldOptions.map((key) => `'${key}'`).join(", ");
    warn(
      `${deprecatedOptions} have been replaced by a new 'plugins' option. ` +
        "Please use this new option instead. For more details, see" +
        "https://github.com/microsoft/rnx-kit/tree/main/packages/cli#readme"
    );

    const {
      detectCyclicDependencies,
      detectDuplicateDependencies,
      typescriptValidation,
    } = bundlerPlugins;

    if (typeof detectDuplicateDependencies === "object") {
      metroPlugins.push(DuplicateDependencies(detectDuplicateDependencies));
    } else if (detectDuplicateDependencies !== false) {
      metroPlugins.push(DuplicateDependencies());
    }

    if (typeof detectCyclicDependencies === "object") {
      metroPlugins.push(CyclicDependencies(detectCyclicDependencies));
    } else if (detectCyclicDependencies !== false) {
      metroPlugins.push(CyclicDependencies());
    }

    if (typescriptValidation !== false) {
      const plugin = TypeScriptPlugin(typescriptValidation, print);
      serializerHooks["@rnx-kit/metro-plugin-typescript"] = plugin;
    }
  } else {
    const plugins =
      bundlerPlugins.plugins || getDefaultBundlerPlugins().plugins;
    for (const entry of plugins) {
      const [module, options] = Array.isArray(entry)
        ? entry
        : [entry, undefined];
      const plugin = importPlugin(module);
      switch (plugin.type) {
        case "serializer":
          metroPlugins.push(plugin(options));
          break;

        case "serializerHook":
          serializerHooks[module] = plugin(options, print);
          break;

        default:
          throw new Error(`${module}: unknown plugin type: ${plugin.type}`);
      }
    }
  }

  if (bundlerPlugins.treeShake) {
    metroConfig.serializer.customSerializer =
      MetroSerializerEsbuild(metroPlugins);
    Object.assign(metroConfig.transformer, esbuildTransformerConfig);
  } else if (metroPlugins.length > 0) {
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
      metroPlugins
    ) as SerializerConfigT["customSerializer"];
  } else {
    delete metroConfig.serializer.customSerializer;
  }

  const hooks = Object.values(serializerHooks);
  switch (hooks.length) {
    case 0:
      break;
    case 1:
      metroConfig.serializer.experimentalSerializerHook = hooks[0];
      break;
    default:
      metroConfig.serializer.experimentalSerializerHook = (graph, delta) => {
        for (const hook of hooks) {
          hook(graph, delta);
        }
      };
      break;
  }
}
