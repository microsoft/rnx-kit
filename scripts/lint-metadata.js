import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ignoredLocations = [".", "packages/test-app", "scripts"];
const options = { encoding: "utf-8" };

fs.readFile("package.json", options, (err, data) => {
  if (err) {
    throw err;
  }

  const { repository: origin } = JSON.parse(data);

  const yarn = spawnSync("yarn", ["workspaces", "list", "--json"], options);
  const workspaces = yarn.stdout.trim().split("\n");

  for (const { location } of workspaces.map((json) => JSON.parse(json))) {
    if (ignoredLocations.includes(location)) {
      continue;
    }

    const pkgJsonPath = path.join(location, "package.json");
    let needsUpdate = false;
    fs.readFile(pkgJsonPath, options, (err, data) => {
      if (err) {
        throw err;
      }

      const manifest = JSON.parse(data);
      const { homepage, repository } = manifest;

      const readmeUrl = `${origin.url}/tree/main/${location}#readme`;
      if (homepage !== readmeUrl) {
        needsUpdate = true;
        manifest.homepage = readmeUrl;
      }

      if (
        repository?.type !== origin.type ||
        repository?.url !== origin.url ||
        repository?.directory !== location
      ) {
        needsUpdate = true;
        manifest.repository = {
          ...origin,
          directory: location,
        };
      }

      if (needsUpdate) {
        fs.writeFile(
          pkgJsonPath,
          JSON.stringify(manifest, undefined, 2) + "\n",
          (err) => {
            if (err) {
              throw err;
            }

            console.log("Updated", pkgJsonPath);
          }
        );
      }
    });
  }
});
