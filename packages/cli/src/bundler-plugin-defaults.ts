import type { BundlerPlugins } from "@rnx-kit/config";

export function getDefaultBundlerPlugins(): Required<BundlerPlugins> {
  return {
    detectCyclicDependencies: true,
    detectDuplicateDependencies: true,
    typescriptValidation: true,
    treeShake: false,
  };
}
