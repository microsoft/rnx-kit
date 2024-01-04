#!/usr/bin/env node
// @ts-check

import { bundle } from "@rnx-kit/scripts/src/commands/bundle.js";
import { markdownTable } from "markdown-table";
import * as fs from "node:fs";

const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit/align-deps/capabilities start -->";
const TOKEN_END = "<!-- @rnx-kit/align-deps/capabilities end -->";

/**
 * Returns whether specified capability is a core capability.
 * @param capability {string}
 * @returns {boolean}
 */
function isCoreCapability(capability) {
  return capability === "core" || capability.startsWith("core-");
}

/**
 * Loads the `microsoft/react-native` preset.
 */
async function loadPreset() {
  // Ensure we always have an updated preset
  await bundle({});

  /** @type {typeof import("../src/index.ts")} */
  const { presets } = await import("../lib/index.js");
  return presets["microsoft/react-native"];
}

/**
 * Compare function that places core capabilities first.
 * @param lhs {string}
 * @param rhs {string}
 * @returns {number}
 */
function sortCoreFirst(lhs, rhs) {
  if (isCoreCapability(lhs)) {
    if (!isCoreCapability(rhs)) {
      return -1;
    }
  } else if (isCoreCapability(rhs)) {
    return 1;
  }

  if (lhs === rhs) {
    return 0;
  }

  return lhs < rhs ? -1 : 1;
}

const preset = await loadPreset();
const allVersions = /** @type {string[]} */ (Object.keys(preset).reverse());
const allCapabilities = /** @type {import("@rnx-kit/config").Capability[]} */ (
  Object.keys(preset[allVersions[0]]).sort(sortCoreFirst)
);

const table = markdownTable([
  ["Capability", ...allVersions],
  ...allCapabilities.map((capability) => {
    return [
      capability,
      ...allVersions.map((profileVersion) => {
        const pkg = preset[profileVersion][capability];
        if ("version" in pkg) {
          const { name, version } = pkg;
          return `${name}@${version.replace("<", "&lt;").replace(">", "&gt;")}`;
        } else if (pkg.capabilities.length > 0) {
          return `Meta package for installing ${pkg.capabilities
            .map((name) => `\`${name}\``)
            .join(", ")}`;
        } else {
          return "-";
        }
      }),
    ];
  }),
]);

const readme = fs.readFileSync(README, { encoding: "utf-8" });
const updatedReadme = readme.replace(
  new RegExp(`${TOKEN_START}([^]+)${TOKEN_END}`),
  `${TOKEN_START}\n\n${table}\n\n${TOKEN_END}`
);

if (updatedReadme !== readme) {
  fs.writeFileSync(README, updatedReadme);
}
