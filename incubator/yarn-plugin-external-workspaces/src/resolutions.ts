import {
  getExternalWorkspacesSettings,
  type TraceFunc,
} from "@rnx-kit/tools-workspaces/external";
import {
  type Descriptor,
  type IdentHash,
  type Project,
  structUtils,
} from "@yarnpkg/core";
import fs from "node:fs";
import path from "node:path";
import { ExternalResolver } from "./resolver";

const protocol = ExternalResolver.protocol;
const range = protocol + "*";

/**
 * @param resolutions existing resolutions in package.json
 * @param newExternals the new set of external workspaces
 * @returns entries for added and removed externals
 */
function determineDeltas(
  resolutions: Record<string, string>,
  newExternals: Set<string>
) {
  const existingExternals = new Set<string>(
    Object.keys(resolutions).filter((key) =>
      resolutions[key].startsWith(protocol)
    )
  );
  const addedExternals = new Set<string>();
  const removedExternals = new Set<string>();

  for (const external of newExternals) {
    if (!existingExternals.has(external)) {
      addedExternals.add(external);
    }
  }

  for (const external of existingExternals) {
    if (!newExternals.has(external)) {
      removedExternals.add(external);
    }
  }

  return { addedExternals, removedExternals };
}

/**
 * @param rootPath root path for the project
 * @param newExternals the list of external packages that need to be added to the resolutions
 * @param checkOnly run in check-only mode where no changes are written
 * @param trace function to report output
 */
function handleFoundExternals(
  rootPath: string,
  newExternals: Set<string>,
  checkOnly: boolean | undefined,
  trace: TraceFunc
) {
  const rootJson = path.join(rootPath, "package.json");
  const manifest = JSON.parse(fs.readFileSync(rootJson, "utf8"));
  const resolutions: Record<string, string> = manifest.resolutions || {};
  const { addedExternals, removedExternals } = determineDeltas(
    resolutions,
    newExternals
  );

  if (addedExternals.size > 0 || removedExternals.size > 0) {
    trace("Found changes to resolutions for external workspaces");

    for (const external of addedExternals) {
      resolutions[external] = range;
      trace(`+ external workspace: ${external}`);
    }

    for (const external of removedExternals) {
      delete resolutions[external];
      trace(`- external workspace: ${external}`);
    }

    if (!checkOnly) {
      trace(`Updating ${rootJson} with changes to resolutions`);
      // sort the resolutions object by key
      const sorted = Object.keys(resolutions)
        .sort()
        .reduce(
          (obj, key) => {
            obj[key] = resolutions[key];
            return obj;
          },
          {} as Record<string, string>
        );
      manifest.resolutions = sorted;
      fs.writeFileSync(rootJson, JSON.stringify(manifest, null, 2));
    }
  } else {
    trace("No changes needed");
  }
}

/**
 * Check the resolutions settings on the root package.json to ensure that all external workspaces are included
 * @param project loaded yarn Project for this repository
 * @param checkOnly run in check-only mode where no changes are written
 */
export function checkProjectResolutions(project: Project, checkOnly?: boolean) {
  const { trace, finder } = getExternalWorkspacesSettings(project.cwd, true);
  const foundExternals = new Set<string>();
  const toCheck = new Set<Descriptor>();

  // helper to check the dependencies, and add new external dependencies to the set to check
  const checkPackage = (dependencySets: Map<IdentHash, Descriptor>[]) => {
    for (const dependencies of dependencySets) {
      for (const descriptor of dependencies.values()) {
        if (project.tryWorkspaceByDescriptor(descriptor) === null) {
          const name = structUtils.stringifyIdent(descriptor);
          const info = finder(name);
          if (info) {
            foundExternals.add(name);
            if (!toCheck.has(descriptor)) {
              toCheck.add(descriptor);
            }
          }
        }
      }
    }
  };

  // process the dependencies of the workspaces
  project.workspacesByIdent.forEach((workspace) => {
    checkPackage([
      workspace.manifest.dependencies,
      workspace.manifest.devDependencies,
    ]);
  });

  // process any external workspaces to follow dependency chains to ensure transitive external dependencies are found
  for (const descriptor of toCheck) {
    const resolution = project.storedResolutions.get(descriptor.descriptorHash);
    if (resolution) {
      // get the manifest from the resolution
      const pkg = project.storedPackages.get(resolution);
      if (pkg) {
        checkPackage([pkg.dependencies]);
      }
    }
  }

  // handle the found externals
  handleFoundExternals(project.cwd, foundExternals, checkOnly, trace);
}
