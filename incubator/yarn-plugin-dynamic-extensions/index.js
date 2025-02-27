// @ts-check

/**
 * @import { Configuration, Hooks, Manifest, PackageExtensionData, Plugin } from "@yarnpkg/core";
 * @typedef {{ cwd: string; manifest: Manifest["raw"]; }} Workspace;
 */

const DYNAMIC_PACKAGE_EXTENSIONS_KEY = "dynamicPackageExtensions";

// This module *must* be CommonJS because `actions/setup-node` (and probably
// other GitHub actions) does not support ESM. Yarn itself does.
exports.name = "@rnx-kit/yarn-plugin-dynamic-extensions";

/** @type {(require: NodeJS.Require) => Plugin<Hooks>} */
exports.factory = (require) => {
  const { Project, SettingsType, structUtils } = require("@yarnpkg/core");

  /**
   * @param {Configuration} configuration
   * @param {string} projectRoot
   * @returns {Promise<((ws: Workspace) => PackageExtensionData | undefined) | void>}
   */
  async function loadUserExtensions(configuration, projectRoot) {
    const packageExtensions = configuration.get(DYNAMIC_PACKAGE_EXTENSIONS_KEY);
    if (
      typeof packageExtensions !== "string" ||
      packageExtensions === "false"
    ) {
      return;
    }

    const path = require("node:path");
    const { pathToFileURL } = require("node:url");

    // On Windows, import paths must include the `file:` protocol.
    const url = pathToFileURL(path.resolve(projectRoot, packageExtensions));
    const external = await import(url.toString());
    return external?.default ?? external;
  }

  /** @type {Plugin<Hooks>["configuration"] & Record<string, unknown>} */
  const configuration = {};
  configuration[DYNAMIC_PACKAGE_EXTENSIONS_KEY] = {
    description: "Path to module providing package extensions",
    type: SettingsType.STRING,
  };

  return {
    configuration,
    hooks: {
      registerPackageExtensions: async (
        configuration,
        registerPackageExtension
      ) => {
        const { projectCwd } = configuration;
        if (!projectCwd) {
          return;
        }

        const { workspace } = await Project.find(configuration, projectCwd);
        if (!workspace) {
          return;
        }

        // @ts-expect-error Cannot find module or its corresponding type declarations
        const { npath } = require("@yarnpkg/fslib");

        const root = npath.fromPortablePath(projectCwd);
        const getUserExtensions = await loadUserExtensions(configuration, root);
        if (!getUserExtensions) {
          return;
        }

        workspace.project.workspacesByCwd.forEach(({ cwd, manifest }) => {
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
  };
};
