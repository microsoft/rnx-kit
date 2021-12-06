#!/usr/bin/env node
// @ts-check

(async () => {
  const { isMetaPackage } = require("../lib/capabilities");
  const { defaultProfiles } = require("../lib/profiles");

  const allVersions = /** @type {import("../src/types").ProfileVersion[]} */ (
    Object.keys(defaultProfiles).reverse()
  );

  /** @type {Record<string, { name: string; version: string; latest: string; homepage: string; }>} */
  const delta = {};
  await Promise.all(
    Object.entries(defaultProfiles[allVersions[0]]).map(
      ([capability, package]) => {
        if (isMetaPackage(package)) {
          return Promise.resolve();
        }

        const { name, version } = package;
        return new Promise((resolve) => {
          const { spawn } = require("child_process");
          const os = require("os");

          /** @type {string[]} */
          const result = [];

          const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
          const fetch = spawn(npm, ["view", "--json", name]);
          fetch.stdout.on("data", (data) => {
            result.push(data);
          });
          fetch.on("close", (code) => {
            if (code !== 0 || result.length === 0) {
              resolve();
            } else {
              const list = JSON.parse(result.join(""));
              const latest = Array.isArray(list) ? list[list.length - 1] : list;
              delta[capability] = {
                name,
                version,
                latest: latest.version,
                homepage: latest.homepage,
              };
              resolve();
            }
          });
        });
      }
    )
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
