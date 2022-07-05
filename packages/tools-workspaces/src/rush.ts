import * as fs from "node:fs/promises";
import * as path from "node:path";

type RushProject = {
  packageName: string;
  projectFolder: string;
};

// https://rushjs.io/pages/configs/rush_json/
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const config = await fs.readFile(configFile, { encoding: "utf-8" });
  const { projects } = JSON.parse(config);
  const root = path.dirname(configFile);
  return projects.map((project: RushProject) =>
    path.join(root, project.projectFolder)
  );
}
