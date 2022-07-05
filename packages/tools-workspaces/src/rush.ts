import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";

type RushProject = {
  packageName: string;
  projectFolder: string;
};

function parse(config: string, configFile: string): string[] {
  const { projects } = JSON.parse(config);
  const root = path.dirname(configFile);
  return projects.map((project: RushProject) =>
    path.join(root, project.projectFolder)
  );
}

// https://rushjs.io/pages/configs/rush_json/
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const config = await readFile(configFile, { encoding: "utf-8" });
  return parse(config, configFile);
}

export function findWorkspacePackagesSync(configFile: string): string[] {
  const config = readFileSync(configFile, { encoding: "utf-8" });
  return parse(config, configFile);
}
