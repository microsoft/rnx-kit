#!/usr/bin/env node
// @ts-check

/**
 * Displays a table of all capabilities that resolve to a package, its current
 * version, and the latest available version.
 *
 * Note that this script spawns a new process for each capability in parallel.
 * It currently does not honor throttling hints of any kind.
 */
(async () => {
  const pacote = require("pacote");
  const { isMetaPackage } = require("../lib/capabilities");
  const { defaultProfiles } = require("../lib/profiles");

  const allVersions = /** @type {import("../src/types").ProfileVersion[]} */ (
    Object.keys(defaultProfiles).reverse()
  );
  const latestProfile = defaultProfiles[allVersions[0]];

  /** @type {Record<string, { name: string; version: string; latest: string; homepage: string; }>} */
  const delta = {};
  await Promise.all(
    Object.entries(latestProfile).map(([capability, pkg]) => {
      if (isMetaPackage(pkg)) {
        return Promise.resolve();
      }

      const { name, version } = pkg;
      return pacote.manifest(name, { fullMetadata: true }).then((manifest) => {
        delta[capability] = {
          name,
          version,
          latest: manifest.version,
          homepage: manifest.homepage,
        };
      });
    })
  );

  const markdownTable = require("markdown-table");
  const table = markdownTable([
    ["Capability", "Name", "Version", "Latest", "Homepage"],
    ...Object.keys(delta)
      .sort()
      .map((capability) => {
        const { name, version, latest, homepage } = delta[capability];
        return [
          capability,
          name,
          version,
          version.endsWith(latest) ? "=" : latest,
          homepage,
        ];
      }),
  ]);
  console.log(table);
})();
