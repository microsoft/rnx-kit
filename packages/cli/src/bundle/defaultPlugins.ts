import type { BundlerPlugins } from "@rnx-kit/config";

export function getDefaultBundlerPlugins(): Required<BundlerPlugins> {
  return {
    extraSerializationPlugins: [],
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: false,
  };
}
