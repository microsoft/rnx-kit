import { BaseCommand, WorkspaceRequiredError } from "@yarnpkg/cli";
import {
  Cache,
  Configuration,
  PackageExtensionStatus,
  Project,
  StreamReport,
} from "@yarnpkg/core";
import { Command, Option } from "clipanion";
import type { InstallOptions } from "./types";

export class Download extends BaseCommand {
  static override paths = [["download"]];

  static override usage = Command.Usage({
    description:
      "Download and cache all packages without installing (offline preparation)",
    details: `
      This command runs through the resolution and fetch process to download all packages
      and prepare them in the .yarn/cache folder. It does NOT create node_modules or any
      symlinks, making it ideal for preparing an offline cache.

      This is useful for:
      - Pre-populating the cache before going offline
      - Creating a cache for CI/CD systems
      - Preparing packages for later offline installation

      The command will:
      1. Resolve all dependencies using the lockfile
      2. Download and prepare all packages in .yarn/cache
      3. Skip the link step entirely (no node_modules)
    `,
    examples: [
      ["Download all packages for offline use", "$0 download"],
      ["Download with verbose logging", "$0 download --verbose"],
    ],
  });

  verbose = Option.Boolean("--verbose", false, {
    description: "Report out verbose logs of the download process",
  });

  async execute() {
    const { stdout } = this.context;

    // Setup yarn configuration, project, and cache information
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );
    const cache = await Cache.find(configuration);

    // Needs to be a valid project with a workspace setup
    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd);
    }

    // Load the zip file in the cache to restore install state, skip resolutions as those will be run
    await project.restoreInstallState({
      restoreResolutions: false,
    });

    // Create stream report to wrap the output of the download process
    const report = await StreamReport.start(
      {
        configuration,
        stdout,
        includeLogs: true,
        includeVersion: true,
      },
      async (report) => {
        if (this.verbose) {
          report.reportInfo(0, `Starting download of all packages to cache`);
        }

        const options = { cache, report, immutable: true };
        await downloadOnly(project, configuration, options, this.verbose);
      }
    );

    return report.exitCode();
  }
}

/**
 * Download and cache all packages without installing them.
 * This runs resolution and fetch steps but skips the link step entirely.
 *
 * @param project yarn Project
 * @param configuration yarn Configuration
 * @param opts install options driving the download
 * @param verbose report out additional information
 */
async function downloadOnly(
  project: Project,
  configuration: Configuration,
  opts: InstallOptions,
  verbose = false
): Promise<void> {
  const { report } = opts;

  // Load the package extensions from the configuration
  const packageExtensions = await configuration.getPackageExtensions();

  // Mark certain extensions inactive, replicated from Project.install
  for (const extensionsByIdent of packageExtensions.values()) {
    for (const [, extensionsByRange] of extensionsByIdent) {
      for (const extension of extensionsByRange) {
        extension.status = PackageExtensionStatus.Inactive;
      }
    }
  }

  // Run the resolution step to ensure all dependencies are resolved
  await report.startTimerPromise(`Resolution step`, async () => {
    await project.resolveEverything(opts);
  });

  if (verbose) {
    report.reportInfo(
      0,
      `Resolved ${project.storedResolutions.size} packages with ${project.accessibleLocators.size} unique locators`
    );
  }

  // Run the fetch step to download and prepare all packages in .yarn/cache
  await report.startTimerPromise(`Fetch step`, async () => {
    await project.fetchEverything(opts);
  });

  if (verbose) {
    report.reportInfo(
      0,
      `Downloaded and cached ${project.accessibleLocators.size} packages`
    );
  }

  // Explicitly skip the link step - this is the key difference from install
  // No node_modules, no symlinks, just cached packages

  if (verbose) {
    report.reportInfo(
      0,
      `Skipping link step - packages are cached and ready for offline installation`
    );
  }

  // Save the install state in the cache
  await project.persistInstallStateFile();
}
