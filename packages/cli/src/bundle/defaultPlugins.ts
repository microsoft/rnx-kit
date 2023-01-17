import type { BundleParameters } from "@rnx-kit/config";

type DefaultPlugins = Pick<Required<BundleParameters>, "plugins" | "treeShake">;

const defaultPlugins: DefaultPlugins = {
  plugins: [
    "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
    "@rnx-kit/metro-plugin-duplicates-checker",
    "@rnx-kit/metro-plugin-typescript",
  ],
  treeShake: false,
};

export function getDefaultBundlerPlugins(): DefaultPlugins {
  return defaultPlugins;
}
