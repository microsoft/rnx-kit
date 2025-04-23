import { BaseCommand } from "@yarnpkg/cli";
import { Configuration, Project, structUtils } from "@yarnpkg/core";
import { npath, type PortablePath, ppath } from "@yarnpkg/fslib";
import { Command, Option, UsageError } from "clipanion";
import fs from "node:fs";
import { getPluginConfiguration } from "./cofiguration";
import { type WorkspaceOutputGeneratedContent } from "./types";

const outputVersion = "1.0.0";

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
    const { quiet, stdout } = this.context;
    const report = quiet
      ? () => null
      : (msg: string) => stdout.write(`${msg}\n`);
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const settings = getPluginConfiguration(configuration);
    const { project } = await Project.find(configuration, this.context.cwd);
    const outputPath = this.target || settings.outputPath;
    if (!outputPath) {
      throw new UsageError(
        `No output path specified in configuration or command. Use --target to specify a path`
      );
    }

    // write out the workspace info to the path as requested
    await outputWorkspaces(
      project,
      npath.toPortablePath(outputPath),
      this.checkOnly,
      report
    );
  }
}

/**
 * @param project yarn Project for this repo
 * @param target target path to write out workspace information to
 * @param includePrivate whether to include private packages
 * @param checkOnly only test to see whether there are unwritten changes
 * @param trace output logging information for the operation
 */
export function outputWorkspaces(
  project: Project,
  outputPath: PortablePath,
  checkOnly: boolean,
  report: (msg: string) => void
): void {
  // ensure we have a valid filename and that the directory exists
  const includesJson = outputPath.endsWith(".json");
  const outputDir = npath.fromPortablePath(
    includesJson ? ppath.dirname(outputPath) : outputPath
  );
  const outputFile = includesJson
    ? ppath.basename(outputPath)
    : fallbackOutputFilename(project);

  if (!checkOnly && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
  }
  const fullPath = npath.join(outputDir, outputFile);

  const workspaces: Record<string, string> = {};
  // iterate the workspaces and record their names and paths
  project.workspacesByIdent.forEach((workspace) => {
    const { name: ident, private: isPrivate } = workspace.manifest;
    if (ident && !isPrivate) {
      const name = structUtils.stringifyIdent(ident);
      workspaces[name] = ppath.relative(project.cwd, workspace.cwd);
    }
  });

  // grab the relative path from the config to the repo root
  const repoPath = npath.relative(
    outputDir,
    npath.fromPortablePath(project.cwd)
  );

  // create the new generated content
  const generated: WorkspaceOutputGeneratedContent = {
    repoPath,
    version: outputVersion,
    workspaces: sortStringRecord(workspaces),
  };

  // load previous content if it exists
  const parsedJson = fs.existsSync(fullPath)
    ? JSON.parse(fs.readFileSync(fullPath, "utf8"))
    : {};
  const oldGenerated: WorkspaceOutputGeneratedContent =
    parsedJson.generated || {};
  const oldRepoPath = oldGenerated.repoPath || "";

  // see what's changed
  const changes = findDependencyChanges(
    oldGenerated.workspaces || {},
    workspaces
  );
  const hasRootChanges =
    repoPath !== oldRepoPath || oldGenerated.version !== outputVersion;
  if (changes || hasRootChanges) {
    if (checkOnly) {
      reportDependencyChanges(fullPath, oldRepoPath, repoPath, changes, report);
    } else {
      // write out the new generated content
      parsedJson.generated = generated;
      const jsonOutput = JSON.stringify(parsedJson, null, 2);
      fs.writeFileSync(fullPath, jsonOutput);
      report(`Updated workspaces in ${fullPath}`);
    }
  }
}

function reportDependencyChanges(
  jsonPath: string,
  pathOld: string,
  pathNew: string,
  changes: Record<string, ChangeType> | null,
  report: (msg: string) => void
) {
  report(`Updates needed for ${jsonPath}:`);
  if (pathOld !== pathNew) {
    report(`Repo path has changed from ${pathOld} to ${pathNew}`);
  }
  if (changes) {
    for (const name in changes) {
      const change = String(changes[name]).padEnd(6, " ");
      report(`${change} - ${name}`);
    }
  }
}

type ChangeType = "add" | "remove" | "update";

/**
 * Find the changes between two ExternalDeps objects. This will return an object with the keys as the
 * names of the dependencies and the values as "added", "removed", or "changed" depending on the
 * change type.
 *
 * @param oldDeps the old ExternalDeps to compare against
 * @param newDeps the new ExternalDeps to compare to
 * @returns a record of changes or null if no changes were found
 */
function findDependencyChanges(
  oldDeps: Record<string, string>,
  newDeps: Record<string, string>
): Record<string, ChangeType> | null {
  const changes: Record<string, ChangeType> = {};
  let foundChanges = false;

  for (const name in newDeps) {
    if (oldDeps[name]) {
      if (oldDeps[name] !== newDeps[name]) {
        changes[name] = "update";
        foundChanges = true;
      }
    } else {
      changes[name] = "add";
      foundChanges = true;
    }
  }

  for (const name in oldDeps) {
    if (!newDeps[name]) {
      changes[name] = "remove";
      foundChanges = true;
    }
  }

  return foundChanges ? changes : null;
}

/**
 * return a string record in sorted order by key
 */
function sortStringRecord<T>(toSort: Record<string, T>): Record<string, T> {
  const sortedKeys = Object.keys(toSort).sort();
  const target: Record<string, T> = {};
  for (const key of sortedKeys) {
    target[key] = toSort[key];
  }
  return target;
}

/**
 * @param root the root of the project
 * @returns a fallback filename, either from the package.json name or a default
 */
function fallbackOutputFilename(project: Project): string {
  const rootWorkspace = project.workspacesByCwd.get(project.cwd);
  const rootIdent = rootWorkspace?.manifest.name;
  if (rootIdent) {
    const pkgNameBase = rootIdent.scope
      ? `@${rootIdent.scope}-${rootIdent.name}`
      : rootIdent.name;
    return `${pkgNameBase}-workspaces.json`;
  }
  return "workspaces.json";
}
