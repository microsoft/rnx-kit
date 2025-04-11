import { BaseCommand, WorkspaceRequiredError } from "@yarnpkg/cli";
import {
  Cache,
  Configuration,
  type Descriptor,
  type DescriptorHash,
  type LocatorHash,
  type Package,
  PackageExtensionStatus,
  Project,
  StreamReport,
  structUtils,
  type Workspace,
} from "@yarnpkg/core";
import { Command, Option, UsageError } from "clipanion";

type InstallOptions = {
  cache: Cache;
  report: StreamReport;
  lockfileOnly?: boolean;
  immutable?: boolean;
};

type ProjectScopingOptions = {
  project: Project;
  accessibleLocators: Set<LocatorHash>;
  storedResolutions: Map<DescriptorHash, LocatorHash>;
};

export class InstallTo extends BaseCommand {
  static override paths = [["install-to"]];

  static override usage = Command.Usage({
    description:
      "Download and install only the packages required for the given workspace or workspaces",
    details: `
      Given the name of one or more project workspaces, this command will install only the packages required for those workspaces.
      This is primarily useful for a focused CI build that builds a subset of a large monorepo.

      Note that this will use the lockfile as is, running the resolution step such that the data in the lockfile is trusted as-is. The command
      is optimized for speed of install, assuming that previous standard install commands will have been run to ensure the lockfile is up to date and correct.
    `,
    examples: [
      [
        "Install a single package and its dependencies",
        "$0 install-to workspace-package-name",
      ],
      [
        "Install multiple packages and their dependencies",
        "$0 install-to @my-scope/workspace-package-1 @my-scope/workspace-package-2",
      ],
    ],
  });

  verbose = Option.Boolean("--verbose", false, {
    description: "Report out verbose logs of the install process",
  });

  workspaceNames = Option.Rest({ required: 1 });

  async execute() {
    const { stdout } = this.context;
    // setup yarn configuration, project, and cache information to run the install
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );
    const cache = await Cache.find(configuration);

    // figure out the workspaces to install, will throw if invalid workspaces are encountered
    const workspaces = workspacesFromNames(this.workspaceNames, project);

    // need to have at least one specified workspace to install to
    if (workspaces.size === 0) {
      throw new UsageError(
        `No valid workspaces specified. Please provide one or more workspace names`
      );
    }
    // also needs to be a valid project with a workspace setup
    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd);
    }

    // load the zip file in the cache to restore install state, skip resolutions as those will be run
    await project.restoreInstallState({
      restoreResolutions: false,
    });

    // Create one of yarn's stream report to wrap the output of the install process
    const report = await StreamReport.start(
      {
        configuration,
        stdout,
        includeLogs: true,
        includeVersion: true,
      },
      async (report) => {
        if (this.verbose) {
          for (const workspace of workspaces) {
            const name = structUtils.prettyWorkspace(configuration, workspace);
            report.reportInfo(
              0,
              `Installing workspace ${name} (${workspace.cwd})`
            );
          }
        }
        const options = { cache, report, immutable: true };
        await partialInstall(
          project,
          configuration,
          workspaces,
          options,
          this.verbose
        );
      }
    );

    return report.exitCode();
  }
}

/**
 * Resolve the specified workspace names into a set of Workspace instances
 * @returns a set of resolved workspaces
 * @throws if any invalid workspaces are encountered
 */
function workspacesFromNames(
  names: string[],
  project: Project
): Set<Workspace> {
  const workspaces = new Set<Workspace>();
  for (const name of names) {
    const workspace = project.tryWorkspaceByIdent(structUtils.parseIdent(name));
    if (!workspace) {
      throw new UsageError(
        `Unable to find workspace for ${name}. Please ensure the workspace name is correct`
      );
    }
    workspaces.add(workspace);
    const dependencies = workspace.getRecursiveWorkspaceDependencies();
    for (const dependency of dependencies) {
      workspaces.add(dependency);
    }
  }
  // add the root workspace as well
  workspaces.add(project.topLevelWorkspace);
  return workspaces;
}

/**
 * Map from the descriptor, to the Package, recording the stored resolution and accessible
 * locator along the way.
 *
 * @returns the Package if it was found and we have not already seen it. Undefined otherwise.
 */
function getResolution(
  options: ProjectScopingOptions,
  hash: DescriptorHash
): Package | undefined {
  const locatorHash = options.project.storedResolutions.get(hash);
  if (locatorHash) {
    const newHash = !options.accessibleLocators.has(locatorHash);
    options.storedResolutions.set(hash, locatorHash);
    options.accessibleLocators.add(locatorHash);
    return newHash
      ? options.project.storedPackages.get(locatorHash)
      : undefined;
  }
  return undefined;
}

/**
 * Recursive dependency traversal function
 */
function traverseDependencies(
  options: ProjectScopingOptions,
  descriptor: Descriptor
) {
  // traverse and record the resolutions, only returns a value if this hasn't been seen
  const pkg = getResolution(options, descriptor.descriptorHash);
  if (pkg) {
    for (const [, dependency] of pkg.dependencies) {
      traverseDependencies(options, dependency);
    }
  }
}

/**
 * Scope the storedResolutions (which drive fetch) and accessibleLocators (which drive link)
 * to the given set of workspaces. This will traverse the dependencies of the workspaces
 * and mark the storedResolutions and accessibleLocators as needed.
 */
function pareDownProject(project: Project, workspaces: Set<Workspace>) {
  const options: ProjectScopingOptions = {
    project,
    accessibleLocators: new Set<LocatorHash>(),
    storedResolutions: new Map<DescriptorHash, LocatorHash>(),
  };

  for (const workspace of workspaces) {
    // add the resolution of this package to tracking lists, package may or may not be returned
    const pkg = getResolution(
      options,
      workspace.anchoredDescriptor.descriptorHash
    );

    // traverse dependencies, preferrring the package but falling back to the manifest
    const dependencies = pkg?.dependencies ?? workspace.manifest.dependencies;
    for (const [, descriptor] of dependencies) {
      traverseDependencies(options, descriptor);
    }
    // for workspace packages also traverse devDependencies
    for (const [, descriptor] of workspace.manifest.devDependencies) {
      traverseDependencies(options, descriptor);
    }
  }

  // replace the values that drive fetch and link
  project.accessibleLocators = options.accessibleLocators;
  project.storedResolutions = options.storedResolutions;
}

/**
 * Perform an install scoped to the gives set of workspaces. Follows the main parts of Project.install,
 * skipping some of the validation steps.
 *
 * @param project yarn Project
 * @param configuration yarn Configuration
 * @param workspaces set of workspaces used for scoping
 * @param opts install options driving the install
 * @param verbose report out additional information
 */
async function partialInstall(
  project: Project,
  configuration: Configuration,
  workspaces: Set<Workspace>,
  opts: InstallOptions,
  verbose = false
): Promise<void> {
  const { report } = opts;

  // load the package extensions from the configuration, this will trigger the getPackageExtensions hook
  const packageExtensions = await configuration.getPackageExtensions();

  // mark certain extensions inactive, replicated from Project.install
  for (const extensionsByIdent of packageExtensions.values()) {
    for (const [, extensionsByRange] of extensionsByIdent) {
      for (const extension of extensionsByRange) {
        extension.status = PackageExtensionStatus.Inactive;
      }
    }
  }

  // run the resolution step, immutable will be set to ensure the lockfile will not be modified
  await report.startTimerPromise(`Resolution step`, async () => {
    await project.resolveEverything(opts);
  });

  // grab the locator count before trimming the project
  const priorLocatorCount = project.accessibleLocators.size;

  // traverse dependencies and resolutions to scope what will be fetched and installed
  pareDownProject(project, workspaces);

  if (verbose) {
    report.reportInfo(
      0,
      `Trimming from ${priorLocatorCount} to ${project.accessibleLocators.size} locators`
    );
  }

  // run the fetch, the storedResolutions will have been scoped, reducing the number of fetchers created
  await report.startTimerPromise(`Fetch step`, async () => {
    await project.fetchEverything(opts);
  });

  // run the link step, this does both install and linking, scoped via reducing project.accessibleLocators
  await report.startTimerPromise(`Link step`, async () => {
    await project.linkEverything(opts);
  });

  // save the new install state in the cache.
  await project.persistInstallStateFile();
}
