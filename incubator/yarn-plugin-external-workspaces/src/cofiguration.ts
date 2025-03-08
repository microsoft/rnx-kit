import { type Configuration, SettingsType } from "@yarnpkg/core";
import { type PortablePath, npath, ppath } from "@yarnpkg/fslib";
import fs from "node:fs";
import {
  type PackagePaths,
  type WorkspaceOutputGeneratedContent,
} from "./types";

const providerKey = "externalWorkspacesProvider";
const outputPathKey = "externalWorkspacesOutputPath";
const outputOnlyOnCommandKey = "externalWorkspacesOutputOnlyOnCommand";

export const externalWorkspacesConfiguration = {
  [providerKey]: {
    description: `Relative path to a .json file of shape WorkspaceOutputJson or a .js file that exports a function of type DefinitionFinder as the default export`,
    type: SettingsType.STRING as const,
    default: null,
  },
  [outputPathKey]: {
    description: `Relative path to a .json file where workspace info should be recorded. If a directory is provided the file will pick up the name from the root package.json`,
    type: SettingsType.STRING as const,
    default: null,
  },
  [outputOnlyOnCommandKey]: {
    description: `Suppress writing out the workspaces on install and only write them out when the command is invoked`,
    type: SettingsType.BOOLEAN as const,
    default: false,
  },
};

export function getPluginConfiguration(configuration: Configuration): {
  provider: PortablePath | null;
  outputPath: PortablePath | null;
  outputOnlyOnCommand: boolean;
} {
  const provider = npath.toPortablePath(
    (configuration.get(providerKey) as string) || ""
  );
  const outputPath = npath.toPortablePath(
    (configuration.get(outputPathKey) as string) || ""
  );
  const outputOnlyOnCommand = Boolean(
    configuration.get(outputOnlyOnCommandKey)
  );
  return { provider, outputPath, outputOnlyOnCommand };
}

export function getFinderFromJsonConfig(
  jsonPath: PortablePath
): (pkgName: string) => PackagePaths | null {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Unable to find external workspaces definition file ${jsonPath}`
    );
  }
  const generated: WorkspaceOutputGeneratedContent =
    JSON.parse(fs.readFileSync(jsonPath, "utf8"))?.generated || {};
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
