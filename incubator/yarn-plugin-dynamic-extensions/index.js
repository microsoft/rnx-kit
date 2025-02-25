// @ts-check

/**
 * @import { Hooks, Manifest, PackageExtensionData, Plugin } from "@yarnpkg/core";
 * @typedef {{ [key: string]: string | number | boolean | JSONObject | JSONObject[] | null }} JSONObject;
 * @typedef {Manifest["raw"]} RawManifest;
 * @typedef {{ cwd: string; manifest: RawManifest; }} Workspace;
 */

const PLUGIN_NAME = "@rnx-kit/yarn-plugin-dynamic-extensions";

/**
 * @param {RawManifest} manifest
 * @returns {JSONObject | undefined}
 */
function getKitConfig({ "rnx-kit": rnxconfig }) {
  if (!rnxconfig || typeof rnxconfig !== "object") {
    return undefined;
  }

  return /** @type {JSONObject} */ (rnxconfig);
}

/**
 * @param {RawManifest} manifest
 * @param {string} projectRoot
 * @param {NodeJS.Require} require
 * @returns {Promise<((ws: Workspace) => PackageExtensionData | undefined) | void>}
 */
async function loadUserExtensions(manifest, projectRoot, require) {
  const rnxconfig = getKitConfig(manifest);
  if (!rnxconfig || !("packageExtensions" in rnxconfig)) {
    return;
  }

  const { packageExtensions } = rnxconfig;
  if (!packageExtensions) {
    return;
  }

  if (typeof packageExtensions === "string") {
    const path = require("node:path");
    const { pathToFileURL } = require("node:url");

    // On Windows, import paths must include the `file:` protocol.
    const url = pathToFileURL(path.resolve(projectRoot, packageExtensions));
    const external = await import(url.toString());
    return external?.default ?? external;
  }

  if (
    typeof packageExtensions === "object" &&
    !Array.isArray(packageExtensions)
  ) {
    return ({ manifest }) => {
      const rnxconfig = getKitConfig(manifest);
      if (!rnxconfig || !("profile" in rnxconfig)) {
        return;
      }

      const { profile } = rnxconfig;
      if (typeof profile !== "string") {
        return;
      }

      const p = packageExtensions[profile];
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        return;
      }

      return /** @type {PackageExtensionData} */ (p);
    };
  }

  console.warn(
    `${PLUGIN_NAME}: invalid configuration: 'packageExtensions' must be an object or a string`
  );
}

// This module *must* be CommonJS because `actions/setup-node` (and probably
// others) does not support ESM. Yarn itself does.
exports.name = PLUGIN_NAME;

/** @type {(require: NodeJS.Require) => Plugin<Hooks>} */
exports.factory = (require) => ({
  hooks: {
    registerPackageExtensions: async (
      configuration,
      registerPackageExtension
    ) => {
      const { projectCwd } = configuration;
      if (!projectCwd) {
        return;
      }

      const { Project, structUtils } = require("@yarnpkg/core");
      // @ts-expect-error Cannot find module or its corresponding type declarations
      const { npath } = require("@yarnpkg/fslib");

      const { workspace } = await Project.find(configuration, projectCwd);
      if (!workspace) {
        return;
      }

      const { manifest, project } = workspace;
      const getUserExtensions = await loadUserExtensions(
        manifest.raw,
        npath.fromPortablePath(projectCwd),
        require
      );
      if (!getUserExtensions) {
        return;
      }

      project.workspacesByCwd.forEach(({ cwd, manifest }) => {
        const { name, version, raw } = manifest;
        if (!name || !version) {
          return;
        }

        /** @type {Workspace} */
        const workspace = { cwd: npath.fromPortablePath(cwd), manifest: raw };
        const data = getUserExtensions(workspace);
        if (!data) {
          return;
        }

        const descriptor = structUtils.makeDescriptor(name, version);
        registerPackageExtension(descriptor, data);
      });
    },
  },
});
