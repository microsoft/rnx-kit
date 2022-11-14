import * as path from "path";
import { readJSON, readJSONSync } from "./common";

type RushProject = {
  packageName: string;
  projectFolder: string;
};

function parse(
  { projects }: { projects: RushProject[] },
  configFile: string
): string[] {
  const root = path.dirname(configFile);
  return projects.map((project: RushProject) =>
    path.join(root, project.projectFolder)
  );
}

// https://rushjs.io/pages/configs/rush_json/
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const project = await readJSON(configFile);
  return parse(project, configFile);
}

export function findWorkspacePackagesSync(configFile: string): string[] {
  const project = readJSONSync(configFile);
  return parse(project, configFile);
}
