export type DependencyVersions = { [key: string]: string };
export type GetDependencyVersions = () => DependencyVersions;

/**
 * Configuration information for an rnx-kit. This is retrieved via cosmi-config
 */
export interface KitConfig {
  /**
   * Whether this kit produces a platform bundle. If true then all defaults will be used. Otherwise the object allows more detailed
   * specification of platform bundle functionality.
   */
  platformBundle?:
    | boolean
    | {
        /**
         * relative path for location within the package to find the built platform bundles. Defaults to './dist'
         */
        distPath?: string;

        /**
         * prefix for the bundle name. Defaults to 'index'
         */
        bundlePrefix?: string;
      };

  /**
   * Retrieve the dependencies for the kit, either via:
   * - string: A file target to open via require
   * - DependencyVersions: An explicit list of versions to treat as part of the kit
   * - GetDependencyVerions: A function which will retrieve the dependency versions on demand
   */
  dependencies?: string | DependencyVersions | GetDependencyVersions;
}
