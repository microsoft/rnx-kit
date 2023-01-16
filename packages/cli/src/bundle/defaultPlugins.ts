import type { BundleParameters } from "@rnx-kit/config";

const defaultPlugins = {
  plugins: [
    "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
    "@rnx-kit/metro-plugin-duplicates-checker",
    "@rnx-kit/metro-plugin-typescript",
  ],
  treeShake: false,
};

export function getDefaultBundlerPlugins(): Required<
  Pick<BundleParameters, "plugins" | "treeShake">
> {
  return defaultPlugins;
}
