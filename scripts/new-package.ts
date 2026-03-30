// a script that takes a string as value and copies the folder packages/template
// to a new folder with the name of the value

import * as fs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { getRootEnginesField } from "./src/rootWorkspace.js";

type Options = {
  experimental?: boolean;
};

const EXPERIMENTAL_BANNER =
  "🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧\n\n### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION\n\n🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧";
const USAGE_TOKEN_START = "<!-- usage start -->";
const USAGE_TOKEN_END = "<!-- usage end -->";
const WARNING_BANNER_TOKEN = "<!-- experimental-warning -->";

function writeTextFile(destination: string, data: unknown): void {
  const fd = fs.openSync(destination, "w");
  if (typeof data === "string") {
    fs.writeSync(fd, data);
  } else {
    fs.writeSync(fd, JSON.stringify(data, undefined, 2));
    fs.writeSync(fd, "\n");
  }
  fs.closeSync(fd);
}

function main(projectName: string, { experimental }: Options): number {
  // do some quick sanitization
  const cleanProjectName = projectName.replace(/[|&;$%@"<>()+,]/g, "");

  const packagesDir = experimental ? "incubator" : "packages";
  const projectDir = packagesDir + "/" + cleanProjectName;

  const newProjectDir = fileURLToPath(
    new URL("../" + projectDir, import.meta.url)
  );
  if (fs.existsSync(newProjectDir)) {
    console.error(`'${projectName}' already exists`);
    return 1;
  }

  fs.mkdirSync(newProjectDir, { recursive: true, mode: 0o755 });

  // copy the package/template folder to a new folder with the name of the value
  // and then change the package.json file to the new name
  const templateDir = fileURLToPath(
    new URL("../packages/template", import.meta.url)
  );

  // copy the template folder to the new project folder
  const opts = {
    dereference: true,
    errorOnExist: true,
    force: false,
    recursive: true,
  };

  for (const file of fs.readdirSync(templateDir)) {
    if (file === "node_modules") {
      continue;
    }

    const source = path.join(templateDir, file);
    const destination = path.join(newProjectDir, file);
    fs.cpSync(source, destination, opts);
  }

  // change the package.json file to the new name
  const packageJsonPath = path.join(newProjectDir, "package.json");
  const data = fs.readFileSync(packageJsonPath);
  const template = JSON.parse(data.toString());
  const manifest = {
    ...template,
    name: "@rnx-kit/" + cleanProjectName,
    version: "0.0.1",
    description: experimental
      ? "EXPERIMENTAL - USE WITH CAUTION - " + cleanProjectName
      : cleanProjectName,
    homepage: template.homepage.replace("packages/template", projectDir),
    engines: getRootEnginesField(),
  };

  manifest.repository.directory = projectDir;

  if (experimental) {
    manifest.experimental = true;
  }

  writeTextFile(packageJsonPath, manifest);

  // change the README.md file to the new name
  const readmePath = path.join(newProjectDir, "README.md");
  const readme = fs.readFileSync(readmePath);
  const updatedReadme = readme
    .toString()
    .replaceAll("template", cleanProjectName)
    .replace(WARNING_BANNER_TOKEN, experimental ? EXPERIMENTAL_BANNER : "")
    .replace(new RegExp(`${USAGE_TOKEN_START}([^]+)${USAGE_TOKEN_END}`), "");

  writeTextFile(readmePath, updatedReadme);

  return 0;
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    experimental: {
      description: "Whether the package is experimental",
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
  tokens: false,
});
if (positionals.length === 0) {
  console.log("Usage: new-package [--experimental] <name>");
  process.exitCode = 1;
} else {
  process.exitCode = main(positionals[0], values);
}
