import { BaseCommand } from "@yarnpkg/cli";
import { Configuration, Project } from "@yarnpkg/core";
import { Command, Option } from "clipanion";
import { checkProjectResolutions } from "./resolutions";
import { getSettingsForProject, outputWorkspaces } from "./utilities";

export class OutputWorkspaces extends BaseCommand {
  static override paths = [["external-workspaces", "output"]];

  static override usage = Command.Usage({
    category: "External Workspaces",
    description: "Output current workspace information to a json file",
    details: `
      This command will output the current set of workspaces to a json file. The file will not be modified if the workspaces have not changed.

      The path to the .json file can optionally have a set of keys appended to the end as a path. This will write the workspaces to a subpath of
      the file while maintaining the other contents of the file.
    `,
    examples: [
      [
        "Output workspaces with settings from package.json",
        "$0 external-workspaces output",
      ],
      [
        "Output workspaces to target",
        "$0 external-workspaces output --target ./path/to/file.json",
      ],
      [
        "Output workspaces to target with a subpath",
        "$0 external-workspaces output --target ./path/to/file.json/key1/key2",
      ],
      [
        "Check if workspaces have changed",
        "$0 external-workspaces output --target ./path/to/file.json --check-only",
      ],
    ],
  });

  target = Option.String("--target", "", {
    description: "The path to the file to output the workspaces to",
  });

  checkOnly = Option.Boolean("--check-only", false, {
    description:
      "Check if the workspaces have changed without writing the file",
  });

  includePrivate = Option.Boolean("--include-private", false, {
    description: "Include private workspaces in the output",
  });

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project } = await Project.find(configuration, this.context.cwd);
    const settings = getSettingsForProject(project);
    const outputPath = this.target || settings.outputPath;

    if (outputPath) {
      await outputWorkspaces(project, settings, outputPath, this.checkOnly);
    }
  }
}

export class CheckResolutions extends BaseCommand {
  static override paths = [["external-workspaces", "resolutions"]];

  static override usage = Command.Usage({
    category: "External Workspaces",
    description: "Check if the workspace resolutions are up to date",
    details: `
      This command will check the current workspace resolutions against the external dependencies defined in the package.json.
    `,
    examples: [
      [
        "Check resolutions with settings from package.json",
        "$0 external-workspaces resolutions",
      ],
    ],
  });

  checkOnly = Option.Boolean("--check-only", false, {
    description:
      "Check if the resolutions are up to date without writing the file",
  });

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project } = await Project.find(configuration, this.context.cwd);
    await checkProjectResolutions(project, this.checkOnly);
  }
}
