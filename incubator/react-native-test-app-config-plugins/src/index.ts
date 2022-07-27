import { getAndroidModFileProviders } from "./plugins/withAndroidBaseMods";
import { getIosModFileProviders } from "./plugins/withIosBaseMods";

export { applyConfigPlugins } from "./apply";
export { compileModsAsync, withDefaultBaseMods } from "./plugins/mod-compiler";
export { withInternal } from "./plugins/withInternal";

export const BaseMods = {
  getAndroidModFileProviders,
  getIosModFileProviders,
};
