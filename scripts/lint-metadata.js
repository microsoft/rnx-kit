import { spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DEFAULT_AUTHOR = {
  name: "Microsoft Open Source",
  email: "microsoftopensource@users.noreply.github.com",
};

const MIN_NODE_VERSION = ">=16.17";
const MIN_NODE_VERSION_NUM = 16017;

const IGNORED_LOCATIONS = [".", "packages/test-app", "scripts"];

const options = { encoding: "utf-8" };

function satisfiesMinNodeVersion(version) {
  if (!version) {
    return false;
  }

  const m = version.match(/(\d+)\.(\d+)/);
  if (!m) {
    return false;
  }

  const [, major, minor] = m;
  return (Number(major) * 1000 + Number(minor)) >= MIN_NODE_VERSION_NUM;
}

fs.readFile("package.json", options).then((data) => {
  const { repository: origin } = JSON.parse(data);

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
    const { author, homepage, repository, engines } = manifest;

    const readmeUrl = `${origin.url}/tree/main/${location}#readme`;
    if (homepage !== readmeUrl) {
      needsUpdate = true;
      manifest.homepage = readmeUrl;
    }

    if (
      author?.name !== DEFAULT_AUTHOR.name ||
      author?.email !== DEFAULT_AUTHOR.email
    ) {
      needsUpdate = true;
      manifest.author = DEFAULT_AUTHOR;
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

    if (!satisfiesMinNodeVersion(engines?.node)) {
      needsUpdate = true;
      manifest.engines = {
        ...engines,
        node: MIN_NODE_VERSION,
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
