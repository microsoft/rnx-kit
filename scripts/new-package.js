// a script that takes a string as value and copies the folder packages/template
// to a new folder with the name of the value

import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";
import yargs from "yargs";

const EXPERIMENTAL_BANNER =
  "🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧\n\n### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION\n\n🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧";
const USAGE_TOKEN_START = "<!-- usage start -->";
const USAGE_TOKEN_END = "<!-- usage end -->";
const WARNING_BANNER_TOKEN = "<!-- experimental-warning -->";

if (!fs.cpSync) {
  console.error("Please use Node 16.13 or higher");
  process.exit(1);
}

const argv = yargs(process.argv.slice(2))
  .usage("Usage: new-package <name> --experimental")
  .example(
    "new-package my-package --experimental",
    "Create a new package named my-package"
  )
  .demandCommand(1)
  .string("name")
  .boolean("experimental")
  .default("experimental", false).argv;

// this is less than ideal, but the only way to make positional working with v16 of yargs
const projectName = argv["_"][0];
const experimental = argv.experimental;

// do some quick sanitization
const cleanProjectName = projectName.replace(/[|&;$%@"<>()+,]/g, "");

const repoRoot = new URL("..", import.meta.url).pathname;

// copy the package/template folder to a new folder with the name of the value
// and then change the package.json file to the new name
const templatePath = path.join(repoRoot, "packages", "template");

const targetFolderPath = experimental ? "incubator" : "packages";

const newProjectPath = path.join(repoRoot, targetFolderPath, cleanProjectName);

// copy the template folder to the new project folder
try {
  fs.cpSync(templatePath, newProjectPath, {
    dereference: true,
    errorOnExist: true,
    force: false,
    recursive: true,
  });
} catch (error) {
  console.error(
    "ERROR: There's already a directory matching that package name!"
  );
}

// change the package.json file to the new name
const packageJsonPath = path.join(newProjectPath, "package.json");
const packageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
);

packageJson.name = "@rnx-kit/" + cleanProjectName;
packageJson.version = "0.0.1";

const prefix = experimental ? "EXPERIMENTAL - USE WITH CAUTION - " : "";
packageJson.description = `${prefix}New package called ${cleanProjectName}`;

packageJson.homepage = packageJson.homepage.replace(
  "packages/template",
  `${targetFolderPath}/${cleanProjectName}`
);

packageJson.repository.directory = `${targetFolderPath}/` + cleanProjectName;

if (experimental) {
  packageJson.experimental = true;
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

// change the README.md file to the new name
const readmePath = path.join(newProjectPath, "README.md");
const readme = fs.readFileSync(readmePath, { encoding: "utf-8" });

const updatedReadme = readme
  .replace(/template/g, cleanProjectName)
  .replace(WARNING_BANNER_TOKEN, experimental ? EXPERIMENTAL_BANNER : "")
  .replace(new RegExp(`${USAGE_TOKEN_START}([^]+)${USAGE_TOKEN_END}`), "");

fs.writeFileSync(readmePath, updatedReadme);
