// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const IGNORED_LOCATIONS = [".", "packages/test-app", "scripts"];

const options = /** @type {const} */ ({ encoding: "utf-8" });

/**
 * @param {string | undefined} version
 * @returns {number}
 */
function numberFromVersion(version) {
  if (!version) {
    return 0;
  }

  const m = version.match(/(\d+)\.(\d+)/);
  if (!m) {
    return 0;
  }

  const [, major, minor] = m;
  return Number(major) * 1000 + Number(minor);
}

/**
 * @param {string | undefined} version
 * @param {number} range
 * @returns {boolean}
 */
function versionGreaterThanOrEqualTo(version, range) {
  return numberFromVersion(version) >= range;
}

fs.readFile("package.json", options).then((data) => {
  const {
    author: defaultAuthor,
    repository: origin,
    engines: { node: nodeVersionRange },
  } = JSON.parse(data);
  const minNodeVersion = numberFromVersion(nodeVersionRange);

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

    if (!versionGreaterThanOrEqualTo(engines?.node, minNodeVersion)) {
      needsUpdate = true;
      manifest.engines = {
        ...engines,
        node: nodeVersionRange,
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
