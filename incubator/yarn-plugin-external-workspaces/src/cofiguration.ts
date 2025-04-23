import {
  type Configuration,
  type Hooks,
  type Plugin,
  SettingsType,
} from "@yarnpkg/core";
import { type PortablePath, npath, ppath } from "@yarnpkg/fslib";
import fs from "node:fs";
import {
  type PackagePaths,
  type WorkspaceOutputGeneratedContent,
  type WorkspaceOutputJson,
} from "./types";

const PROVIDER_KEY = "externalWorkspacesProvider";
const OUTPUT_PATH_KEY = "externalWorkspacesOutputPath";
const OUTPUT_ON_COMMAND_KEY = "externalWorkspacesOutputOnlyOnCommand";

type CustomConfiguration = Plugin<Hooks>["configuration"] &
  Record<string, unknown>;

/**
 * Yarn configuration settings for the external workspaces plugin
 */
export const externalWorkspacesConfiguration: CustomConfiguration = {
  [PROVIDER_KEY]: {
    description: `Relative path to a .json file of shape WorkspaceOutputJson or a .js file that exports a function of type DefinitionFinder as the default export`,
    type: SettingsType.STRING,
    default: null,
  },
  [OUTPUT_PATH_KEY]: {
    description: `Relative path to a .json file where workspace info should be recorded. If a directory is provided the file will pick up the name from the root package.json`,
    type: SettingsType.STRING,
    default: null,
  },
  [OUTPUT_ON_COMMAND_KEY]: {
    description: `Suppress writing out the workspaces on install and only write them out when the command is invoked`,
    type: SettingsType.BOOLEAN,
    default: false,
  },
};

function coercePortablePath(value: unknown, projectCwd: PortablePath | null): PortablePath {
  const p = npath.toPortablePath(typeof value === "string" ? value : "");
  // If we have a project root, convert to an absolute path otherwise Yarn will
  // use the current working directory instead.
  return projectCwd ? ppath.join(projectCwd, p) : p;
}

/**
 * @param configuration The yarn configuration to grab the settings from
 * @returns loaded settings
 */
export function getPluginConfiguration(configuration: Configuration): {
  provider: PortablePath | null;
  outputPath: PortablePath | null;
  outputOnlyOnCommand: boolean;
} {
  const { projectCwd } = configuration;
  const provider = coercePortablePath(configuration.get(PROVIDER_KEY), projectCwd);
  const outputPath = coercePortablePath(configuration.get(OUTPUT_PATH_KEY), projectCwd);
  const outputOnlyOnCommand = Boolean(configuration.get(OUTPUT_ON_COMMAND_KEY));
  return { provider, outputPath, outputOnlyOnCommand };
}

/**
 * @param jsonPath The path to the .json file to load
 * @returns a definition finder that will return a relative path to the file from the location fo the config file
 */
export function getFinderFromJsonConfig(
  jsonPath: PortablePath
): (pkgName: string) => PackagePaths | null {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Unable to find external workspaces definition file ${jsonPath}`
    );
  }
  const parsedJson: WorkspaceOutputJson =
    JSON.parse(fs.readFileSync(jsonPath, "utf8"))?.generated || {};
  const generated: Partial<WorkspaceOutputGeneratedContent> =
    typeof parsedJson.generated === "object" ? parsedJson.generated : {};

  const { repoPath = "", workspaces = {} } = generated;
  const toRepo = npath.toPortablePath(repoPath);
  return (pkgName: string) => {
    const pkgPath = workspaces[pkgName];
    if (pkgPath) {
      return {
        path: ppath.join(toRepo, npath.toPortablePath(pkgPath)),
      };
    }
    return null;
  };
}

/**
 * @param jsPath The path to the .js file to load
 * @throws if the file does not exist or does not export a function as default
 * @returns a definition finder that will return a relative path to the file from the location fo the config js file
 */
export function getFinderFromJsConfig(
  jsPath: PortablePath
): (pkgName: string) => PackagePaths | null {
  if (!fs.existsSync(jsPath)) {
    throw new Error(
      `Unable to find external workspaces definition file ${jsPath}`
    );
  }
  const finder = require(jsPath).default;
  if (typeof finder !== "function") {
    throw new Error(
      `External workspaces definition file ${jsPath} does not export a function as default`
    );
  }
  return finder;
}
