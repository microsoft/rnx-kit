// a script that takes a string as value and copies the folder packages/template
// to a new folder with the name of the value

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import yargs from "yargs";

const EXPERIMENTAL_BANNER =
  "🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧\n\n### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION\n\n🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧";
const USAGE_TOKEN_START = "<!-- usage start -->";
const USAGE_TOKEN_END = "<!-- usage end -->";
const WARNING_BANNER_TOKEN = "<!-- experimental-warning -->";

async function main(argv) {
  if (!fs.cp) {
    console.error("Please use Node 16.13 or higher");
    return 1;
  }

  // this is less than ideal, but the only way to make positional working with v16 of yargs
  const projectName = argv["_"][0];
  const experimental = argv.experimental;

  // do some quick sanitization
  const cleanProjectName = projectName.replace(/[|&;$%@"<>()+,]/g, "");

  // copy the package/template folder to a new folder with the name of the value
  // and then change the package.json file to the new name
  const templateDir = fileURLToPath(
    new URL("../packages/template", import.meta.url)
  );

  const packagesDir = experimental ? "incubator" : "packages";
  const projectDir = packagesDir + "/" + cleanProjectName;

  const newProjectDir = fileURLToPath(
    new URL("../" + projectDir, import.meta.url)
  );
  await fs.mkdir(newProjectDir, { recursive: true, mode: 0o755 });

  // copy the template folder to the new project folder
  const opts = {
    dereference: true,
    errorOnExist: true,
    force: false,
    recursive: true,
  };
  const files = await fs.readdir(templateDir);
  await Promise.all(
    files.map((file) => {
      return file === "node_modules"
        ? Promise.resolve()
        : fs
            .cp(
              path.join(templateDir, file),
              path.join(newProjectDir, file),
              opts
            )
            .catch((e) => console.error(e.message));
    })
  );

  // change the package.json file to the new name
  const packageJsonPath = path.join(newProjectDir, "package.json");
  fs.readFile(packageJsonPath, { encoding: "utf-8" }).then((data) => {
    const template = JSON.parse(data);
    const manifest = {
      ...template,
      name: "@rnx-kit/" + cleanProjectName,
      version: "0.0.1",
      description: experimental
        ? "EXPERIMENTAL - USE WITH CAUTION - " + cleanProjectName
        : cleanProjectName,
      homepage: template.homepage.replace("packages/template", projectDir),
    };

    manifest.repository.directory = projectDir;

    if (experimental) {
      manifest.experimental = true;
    }

    return fs.writeFile(
      packageJsonPath,
      JSON.stringify(manifest, null, 2) + "\n"
    );
  });

  // change the README.md file to the new name
  const readmePath = path.join(newProjectDir, "README.md");
  fs.readFile(readmePath, { encoding: "utf-8" }).then((readme) => {
    const updatedReadme = readme
      .replace(/template/g, cleanProjectName)
      .replace(WARNING_BANNER_TOKEN, experimental ? EXPERIMENTAL_BANNER : "")
      .replace(new RegExp(`${USAGE_TOKEN_START}([^]+)${USAGE_TOKEN_END}`), "");

    return fs.writeFile(readmePath, updatedReadme);
  });

  return 0;
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

main(argv).then((exitCode) => (process.exitCode = exitCode));
