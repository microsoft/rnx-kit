// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const IGNORED_LOCATIONS = [".", "packages/test-app", "scripts"];

const options = /** @type {const} */ ({ encoding: "utf-8" });

fs.readFile("package.json", options).then((data) => {
  const { author: defaultAuthor, repository: origin } = JSON.parse(data);
  const yarn = spawnSync("yarn", ["workspaces", "list", "--json"], options);
  const workspaces = yarn.stdout.trim().split("\n");

  const jobs = workspaces.map(async (json) => {
    const { location } = JSON.parse(json);
    if (IGNORED_LOCATIONS.includes(location)) {
      return;
    }

    let needsUpdate = false;

    const pkgJsonPath = path.join(location, "package.json");
    const data = await fs.readFile(pkgJsonPath, options);
    const manifest = JSON.parse(data);
    const { author, homepage, repository } = manifest;

    const readmeUrl = `${origin.url}/tree/main/${location}#readme`;
    if (homepage !== readmeUrl) {
      needsUpdate = true;
      manifest.homepage = readmeUrl;
    }

    if (
      author?.name !== defaultAuthor.name ||
      author?.email !== defaultAuthor.email
    ) {
      needsUpdate = true;
      manifest.author = defaultAuthor;
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
      let fh;
      try {
        fh = await fs.open(pkgJsonPath, "w");
        await fh.write(JSON.stringify(manifest, undefined, 2));
        await fh.write("\n");
        console.log("Updated", pkgJsonPath);
      } finally {
        await fh?.close();
      }
    }
  });

  return Promise.allSettled(jobs);
});
