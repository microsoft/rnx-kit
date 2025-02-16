// @ts-check
/**
 * @import { Hooks, PackageExtensionData, Plugin } from "@yarnpkg/core";
 * @typedef {(require: NodeJS.Require) => Plugin<Hooks>} Factory;
 */

const NAME = "@rnx-kit/align-deps/yarn-plugin";

/** @type {{ name: string; factory: Factory; }} */
module.exports = {
  name: NAME,
  factory: (require) => {
    /**
     * @param {Record<string, unknown>} config
     * @param {string} projectRoot
     * @returns {Record<string, PackageExtensionData> | undefined}
     */
    function loadUserProfiles({ "rnx-kit": rnxconfig }, projectRoot) {
      if (
        typeof rnxconfig !== "object" ||
        !rnxconfig ||
        !("profiles" in rnxconfig)
      ) {
        return;
      }

      const profiles = rnxconfig.profiles;
      if (!profiles) {
        return;
      }

      switch (typeof profiles) {
        case "object":
          return /** @type {Record<string, PackageExtensionData>} */ (profiles);

        case "string": {
          const { spawnSync } = require("node:child_process");
          const path = require("node:path");
          const profilesPath = path.resolve(projectRoot, profiles);
          const { stdout } = spawnSync(process.argv0, [
            "--no-warnings",
            "--eval",
            `import profiles from "file://${profilesPath}"; console.log(JSON.stringify(profiles));`,
          ]);
          return JSON.parse(stdout.toString().trim());
        }

        default:
          console.warn(
            `${NAME}: invalid configuration: 'profiles' must be an object or a string`
          );
          break;
      }
    }

    return {
      hooks: {
        registerPackageExtensions: async (
          configuration,
          registerPackageExtension
        ) => {
          const projectCwd = configuration.projectCwd;
          if (!projectCwd) {
            return;
          }

          const { Project, structUtils } = require("@yarnpkg/core");

          const { workspace } = await Project.find(configuration, projectCwd);
          if (!workspace) {
            return;
          }

          const { project, manifest } = workspace;
          const userProfiles = loadUserProfiles(manifest.raw, projectCwd);
          if (!userProfiles) {
            return;
          }

          project.workspacesByCwd.forEach(
            ({ manifest: { name, version, raw } }) => {
              if (!name || !version) {
                return;
              }

              const { "rnx-kit": rnxconfig } = raw;
              if (!rnxconfig || !("profile" in rnxconfig)) {
                return;
              }

              const profile = userProfiles[rnxconfig.profile];
              if (!profile) {
                console.warn(`${NAME}: unknown profile: ${rnxconfig.profile}`);
                return;
              }

              const descriptor = structUtils.makeDescriptor(name, version);
              registerPackageExtension(descriptor, profile);
            }
          );
        },
      },
    };
  },
};
