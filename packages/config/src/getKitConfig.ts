import path from "path";
import { KitConfig } from "./kitConfig";
import { cosmiconfigSync } from "cosmiconfig";

/**
 * Options for retrieving a kit config. The default is equivalanet to passing { cwd: process.cwd() }
 */
export type GetKitConfigOptions = {
  /**
   * Retrieve the kit config options, if they exist, from the specified module.
   */
  module?: string;

  /**
   * Retrive teh kit config options, using the target working directory.
   */
  cwd?: string;
};

export function getKitConfig(
  options: GetKitConfigOptions = {}
): KitConfig | null {
  // use a working directory extracted from a module, specified in cwd, or from process.cwd
  const cwd = options.module
    ? path.dirname(require.resolve(options.module + "/package.json"))
    : options.cwd || process.cwd();

  // use the synchronous cosmiconfig load method to see if there is kit info present at the specified location
  const explorerSync = cosmiconfigSync("rnx-kit", { stopDir: cwd });
  const result = explorerSync.search(cwd);
  return result?.config ?? null;
}
