import { BaseCommand, WorkspaceRequiredError } from "@yarnpkg/cli";
import {
  Cache,
  Configuration,
  type Descriptor,
  type LocatorHash,
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
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );
    const cache = await Cache.find(configuration);
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

    await project.restoreInstallState({
      restoreResolutions: false,
    });

    /**
     * Create one of yarn's stream report to wrap the output of the install process
     */
    const report = await StreamReport.start(
      {
        configuration,
        stdout,
        includeLogs: this.verbose,
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
        await partialInstall(project, configuration, workspaces, {
          cache,
          report,
          immutable: true,
        });
      }
    );

    return report.exitCode();
  }
}

function workspacesFromNames(
  names: string[],
  project: Project
): Set<Workspace> {
  const workspaces = new Set<Workspace>();
  for (const name of names) {
    const workspace = project.getWorkspaceByIdent(structUtils.parseIdent(name));
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

function traverseDependencies(
  project: Project,
  found: Set<LocatorHash>,
  descriptor: Descriptor
) {
  const locatorHash = project.storedResolutions.get(descriptor.descriptorHash);
  if (locatorHash && !found.has(locatorHash)) {
    const pkg = project.storedPackages.get(locatorHash);
    if (pkg) {
      found.add(pkg.locatorHash);
      for (const [, descriptor] of pkg.dependencies) {
        traverseDependencies(project, found, descriptor);
      }
    }
  }
}

function getRelevantLocators(
  project: Project,
  workspaces: Set<Workspace>
): Set<LocatorHash> {
  const locators = new Set<LocatorHash>();
  for (const workspace of workspaces) {
    const manifest = workspace.manifest;
    for (const [, descriptor] of manifest.dependencies) {
      traverseDependencies(project, locators, descriptor);
    }
    for (const [, descriptor] of manifest.devDependencies) {
      traverseDependencies(project, locators, descriptor);
    }
  }
  return locators;
}

async function partialInstall(
  project: Project,
  configuration: Configuration,
  workspaces: Set<Workspace>,
  opts: InstallOptions
): Promise<void> {
  const { report } = opts;

  const packageExtensions = await configuration.getPackageExtensions();

  for (const extensionsByIdent of packageExtensions.values())
    for (const [, extensionsByRange] of extensionsByIdent)
      for (const extension of extensionsByRange)
        extension.status = PackageExtensionStatus.Inactive;

  await report.startTimerPromise(`Resolution step`, async () => {
    await project.resolveEverything(opts);
  });

  const locatorsToInstall = getRelevantLocators(project, workspaces);
  for (const hash of project.accessibleLocators) {
    if (!locatorsToInstall.has(hash)) {
      project.disabledLocators.add(hash);
    }
  }
  report.reportInfo(
    0,
    `Trimming from ${project.accessibleLocators.size} to ${locatorsToInstall.size} locators`
  );

  await report.startTimerPromise(`Fetch step`, async () => {
    await project.fetchEverything(opts);
  });

  await report.startTimerPromise(`Link step`, async () => {
    await project.linkEverything(opts);
  });

  await project.persistInstallStateFile();
}
