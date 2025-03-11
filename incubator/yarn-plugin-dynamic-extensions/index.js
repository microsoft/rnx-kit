// @ts-check

/**
 * @import { Configuration, Hooks, Manifest, PackageExtensionData, Plugin } from "@yarnpkg/core";
 * @import { PortablePath } from "@yarnpkg/fslib";
 * @typedef {{ cwd: string; manifest: Manifest["raw"]; }} Workspace;
 */

const DYNAMIC_PACKAGE_EXTENSIONS_KEY = "dynamicPackageExtensions";

// This module *must* be CommonJS because `actions/setup-node` (and probably
// other GitHub actions) does not support ESM. Yarn itself does.
exports.name = "@rnx-kit/yarn-plugin-dynamic-extensions";

/** @type {(require: NodeJS.Require) => Plugin<Hooks>} */
exports.factory = (require) => {
  const { Project, SettingsType, structUtils } = require("@yarnpkg/core");
  const { npath } = require("@yarnpkg/fslib");

  /**
   * @param {Configuration} configuration
   * @param {PortablePath} projectRoot
   * @returns {Promise<((ws: Workspace) => PackageExtensionData | undefined) | void>}
   */
  async function loadUserExtensions(configuration, projectRoot) {
    const packageExtensions = configuration.get(DYNAMIC_PACKAGE_EXTENSIONS_KEY);
    if (typeof packageExtensions !== "string") {
      return;
    }

    const path = require("node:path");
    const { pathToFileURL } = require("node:url");

    // Make sure we resolve user extensions relative to the source config
    const source = configuration.sources.get(DYNAMIC_PACKAGE_EXTENSIONS_KEY);
    const sourceDir = source ? npath.dirname(source) : projectRoot;

    // On Windows, import paths must include the `file:` protocol.
    const root = npath.fromPortablePath(sourceDir);
    const url = pathToFileURL(path.resolve(root, packageExtensions));
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

        const getUserExtensions = await loadUserExtensions(
          configuration,
          projectCwd
        );
        if (!getUserExtensions) {
          return;
        }

        const { workspace } = await Project.find(configuration, projectCwd);
        if (!workspace) {
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
