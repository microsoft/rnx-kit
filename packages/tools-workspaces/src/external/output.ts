import fs from "node:fs";
import path from "node:path";
import { getDepsFromJson, parseJsonPath } from "./finder";
import type { ExternalDeps, PackageDefinition, TraceFunc } from "./types";

type PackageDefinitionWithName = PackageDefinition & { name: string };

function depsToArray(
  deps: ExternalDeps,
  sort?: boolean
): PackageDefinitionWithName[] {
  const result = Object.entries(deps).map(([name, definition]) => ({
    name,
    ...definition,
  }));
  return sort ? result.sort((a, b) => a.name.localeCompare(b.name)) : result;
}

function outputDepsArray(
  deps: PackageDefinitionWithName[],
  container: ExternalDeps
) {
  for (const { name, ...definition } of deps) {
    container[name] = definition;
  }
}

function depsEqual(
  oldDeps: PackageDefinitionWithName[],
  newDeps: PackageDefinitionWithName[]
): boolean {
  return (
    oldDeps.length === newDeps.length &&
    oldDeps.every(
      (def, index) =>
        def.name === newDeps[index].name &&
        def.path === newDeps[index].path &&
        def.version === newDeps[index].version
    )
  );
}

/**
 * Output the current workspaces to a file if they the file needs to be updated
 * @param workspaces current workspaces in ExternalDeps form to write out
 * @param outputPath json target file to output to, will not write if no changes were made
 */
export function writeOutWorkspaces(
  workspaces: ExternalDeps,
  outputPath: string,
  checkOnly: boolean,
  trace: TraceFunc
): void {
  const { jsonPath, keysPath } = parseJsonPath(outputPath);
  if (!jsonPath) {
    throw new Error(`Invalid output path: ${outputPath}`);
  }

  const jsonDir = path.dirname(path.resolve(jsonPath));
  const newDeps = depsToArray(workspaces, true);
  for (const dep of newDeps) {
    if (dep.path) {
      // make the path relative to the json file
      dep.path = path.relative(jsonDir, dep.path);
    }
  }

  const parsedJson = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    : {};

  const parsedDeps = getDepsFromJson(parsedJson, keysPath);
  if (parsedDeps && depsEqual(newDeps, depsToArray(parsedDeps))) {
    trace(`No changes to ${jsonPath}, skipping update`, true);
    return;
  }

  if (checkOnly) {
    trace(`Changes detected in ${jsonPath}, skipping write`);
    return;
  }

  const keys = keysPath ? keysPath.split("/") : [];
  const newJson = keys.length > 0 ? parsedJson : {};
  let current = newJson;

  let key = keys.shift();
  while (key) {
    // build up the path, replacing the last node to write it fully
    if (!current[key] || keys.length === 0) {
      current[key] = {};
    }
    current = current[key];
    key = keys.shift();
  }
  // write out the deps array to the new location
  outputDepsArray(newDeps, current);
  const jsonOutput = JSON.stringify(newJson, null, 2);
  fs.writeFileSync(jsonPath, jsonOutput);
  trace(`Updated ${jsonPath}`);
}
