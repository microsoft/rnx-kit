#!/usr/bin/env -S node --no-warnings --conditions=typescript

import { keysOf } from "@rnx-kit/tools-language/properties";
import { markdownTable } from "markdown-table";
import * as fs from "node:fs";
import { createRequire } from "node:module";

const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit/align-deps/capabilities start -->";
const TOKEN_END = "<!-- @rnx-kit/align-deps/capabilities end -->";

/**
 * Returns whether specified capability is a core capability.
 */
function isCoreCapability(capability: string): boolean {
  return capability === "core" || capability.startsWith("core-");
}

/**
 * Loads the `microsoft/react-native` preset.
 */
async function loadPreset() {
  // `src/cli.ts` is still CommonJS, so we need to define `global.module` and
  // `global.require` to load it properly.
  const globalModule = global.module;
  const globalRequire = global.require;
  try {
    // @ts-expect-error Defining `global.module` for compatibility with CJS
    global.module = {};
    global.require = createRequire(new URL("../src/cli.ts", import.meta.url));

    const { presets } = await import("../src/index.ts");
    return presets["microsoft/react-native"];
  } finally {
    global.module = globalModule;
    global.require = globalRequire;
  }
}

/**
 * Compare function that places core capabilities first.
 * @param lhs {string}
 * @param rhs {string}
 * @returns {number}
 */
function sortCoreFirst(lhs: string, rhs: string): number {
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
const allVersions = keysOf(preset).reverse();
const allCapabilities = keysOf(preset[allVersions[0]]).sort(sortCoreFirst);

const table = markdownTable([
  ["Capability", ...allVersions],
  ...allCapabilities.map((capability) => {
    return [
      capability,
      ...allVersions.map((profileVersion) => {
        const pkg = preset[profileVersion][capability];
        if ("version" in pkg) {
          const { name, version } = pkg;
          return `${name}@${version.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}`;
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
