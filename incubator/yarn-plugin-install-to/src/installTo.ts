import { BaseCommand } from "@yarnpkg/cli";
import {
  Configuration,
  Project,
  structUtils,
  type Workspace,
} from "@yarnpkg/core";
import { Command, Option, UsageError } from "clipanion";

const outputVersion = "1.0.0";

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

  checkOnly = Option.Boolean("--verbose", false, {
    description: "Report out verbose logs of the install process",
  });

  workspaceNames = Option.Rest({ required: 1 });

  async execute() {
    const { quiet, stdout } = this.context;
    const report = quiet
      ? () => null
      : (msg: string) => stdout.write(`${msg}\n`);
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project } = await Project.find(configuration, this.context.cwd);
    if (this.workspaceNames.length === 0) {
      throw new UsageError(
        `No workspaces specified. Please provide one or more workspace names`
      );
    }
    const workspaces = workspacesFromNames(this.workspaceNames, project);
    await partialInstall(project, workspaces, report);
  }
}

function workspacesFromNames(names: string[], project: Project): Workspace[] {
  return names.map((name) =>
    project.getWorkspaceByIdent(structUtils.parseIdent(name))
  );
}

async function partialInstall(
  project: Project,
  workspaces: Workspace[],
  report: (msg: string) => void
): Promise<void> {
  await project.install({});
}
