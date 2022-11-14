#!/usr/bin/env node
// @ts-check

import { existsSync as fileExists } from "fs";
import * as fs from "fs/promises";
import markdownTable from "markdown-table";
import pacote from "pacote";
import * as path from "path";
import semverCoerce from "semver/functions/coerce.js";
import semverCompare from "semver/functions/compare.js";
import { fileURLToPath } from "url";
import { isMetaPackage } from "../lib/capabilities.js";

/**
 * @typedef {import("../src/types").MetaPackage} MetaPackage
 * @typedef {import("../src/types").Package} Package
 * @typedef {import("../src/types").Profile} Profile
 *
 * @typedef {{
 *   name: string;
 *   version: string;
 *   latest: string;
 *   homepage?: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 * }} PackageInfo
 */

/**
 * Fetches package manifest from npm.
 * @param {MetaPackage | Package} pkg
 * @param {string=} defaultTag
 * @returns {Promise<PackageInfo | void>}
 */
async function fetchPackageInfo(pkg, defaultTag = "latest") {
  if (isMetaPackage(pkg)) {
    return Promise.resolve();
  }

  const { name, version } = pkg;
  const manifest = await pacote.manifest(name, {
    defaultTag,
    fullMetadata: true,
  });
  return {
    name,
    version,
    latest: manifest.version,
    homepage: manifest.homepage,
    dependencies: manifest.dependencies,
    peerDependencies: manifest.peerDependencies,
  };
}

/**
 * @param {string} packageName
 * @param {Record<string, string>?} dependencies
 * @returns {string}
 */
function getPackageVersion(packageName, dependencies) {
  const packageVersion = dependencies?.[packageName];
  if (!packageVersion) {
    throw new Error(`Failed to get '${packageName}' version`);
  }

  const coercedVersion = semverCoerce(packageVersion);
  if (!coercedVersion) {
    throw new Error(`Failed to coerce version: ${packageVersion}`);
  }

  return coercedVersion.version;
}

/**
 * Returns the path to a profile.
 * @param {string} preset
 * @param {string} profileVersion
 * @returns {string}
 */
function getProfilePath(preset, profileVersion) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.relative(
    process.cwd(),
    path.join(
      __dirname,
      "..",
      "src",
      "presets",
      preset,
      `profile-${profileVersion}.ts`
    )
  );
}

/**
 * Generates a profile.
 * @param {{
 *   preset: string;
 *   targetVersion: string;
 *   reactVersion: string;
 *   metroVersion: string;
 * }} versions
 * @returns {string}
 */
function generateFromTemplate({
  preset,
  targetVersion,
  reactVersion,
  metroVersion,
}) {
  const nextVersionCoerced = semverCoerce(targetVersion);
  if (!nextVersionCoerced) {
    throw new Error(`Failed to coerce version: ${targetVersion}`);
  }

  const currentVersion = `${nextVersionCoerced.major}.${
    nextVersionCoerced.minor - 1
  }`;

  const currentProfile = getProfilePath(preset, currentVersion);
  if (!fileExists(currentProfile)) {
    throw new Error(`Could not find '${currentProfile}'`);
  }

  const currentVersionVarName = `${nextVersionCoerced.major}_${
    nextVersionCoerced.minor - 1
  }`;
  return `import type { Package, Profile } from "../../../types";
import profile_${currentVersionVarName} from "./profile-${currentVersion}";

const reactNative: Package = {
  name: "react-native",
  version: "^${targetVersion}.0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_${currentVersionVarName},
  react: {
    name: "react",
    version: "${reactVersion}",
  },
  "react-dom": {
    name: "react-dom",
    version: "^${reactVersion}",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "${reactVersion}",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^${targetVersion}.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^${targetVersion}.0",
    capabilities: ["core"],
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^${metroVersion}",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^${metroVersion}",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^${metroVersion}",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^${metroVersion}",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^${metroVersion}",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^${metroVersion}",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^${metroVersion}",
    devOnly: true,
  },
};

export default profile;
`;
}

/**
 * Fetches package versions for specified react-native version.
 * @param {string} preset
 * @param {string} targetVersion
 * @param {Profile} latestProfile
 * @returns {Promise<string | undefined>}
 */
async function makeProfile(preset, targetVersion, latestProfile) {
  const reactNativeInfo = await fetchPackageInfo(
    latestProfile["core"],
    `^${targetVersion}.0-0`
  );
  if (!reactNativeInfo) {
    throw new Error(`Failed to get manifest of 'react-native@${targetVersion}`);
  }

  const { dependencies, peerDependencies } = reactNativeInfo;
  if (!dependencies) {
    throw new Error(
      `Failed to get dependencies of 'react-native@${targetVersion}`
    );
  }
  if (!peerDependencies) {
    throw new Error(
      `Failed to get peer dependencies of 'react-native@${targetVersion}`
    );
  }

  // Fetch `metro` version from `@react-native-community/cli-plugin-metro` > `@react-native-community/cli`
  const cliMetroPluginDependencies = await [
    "@react-native-community/cli",
    "@react-native-community/cli-plugin-metro",
  ].reduce(async (dependencies, packageName) => {
    try {
      const packageInfo = await pacote.manifest(packageName, {
        defaultTag: getPackageVersion(packageName, await dependencies),
        fullMetadata: true,
      });
      return packageInfo.dependencies;
    } catch (e) {
      if (e.code === "ETARGET") {
        // Some packages, such as `@react-native-community/cli`, are still in
        // alpha or beta while react-native RCs. Try again with the `next` tag.
        const packageInfo = await pacote.manifest(packageName, {
          defaultTag: "next",
          fullMetadata: true,
        });
        return packageInfo.dependencies;
      } else {
        throw e;
      }
    }
  }, Promise.resolve(dependencies));

  return generateFromTemplate({
    preset,
    targetVersion,
    reactVersion: getPackageVersion("react", peerDependencies),
    metroVersion: getPackageVersion("metro", cliMetroPluginDependencies),
  });
}

/**
 * Displays a table of all capabilities that resolve to a package, its current
 * version, and the latest available version.
 *
 * If `targetVersion` is specified, also generates a profile.
 *
 * Note that this script spawns a new process for each capability in parallel.
 * It currently does not honor throttling hints of any kind.
 *
 * @param {{ preset?: string; targetVersion?: string; force?: boolean; }} options
 */
async function main({
  preset: presetName = "microsoft/react-native",
  targetVersion = "",
  force,
}) {
  const { preset } = await import(`../lib/presets/${presetName}.js`);
  const allVersions = /** @type {string[]} */ (
    Object.keys(preset)
      .sort((lhs, rhs) => semverCompare(semverCoerce(lhs), semverCoerce(rhs)))
      .reverse()
  );

  const latestProfile = preset[allVersions[0]];

  if (targetVersion) {
    if (!force && preset[targetVersion]) {
      console.error(
        `Profile for '${targetVersion}' already exists. To overwrite it anyway, re-run with '--force'.`
      );
      process.exit(1);
    }

    try {
      const newProfile = await makeProfile(
        presetName,
        targetVersion,
        latestProfile
      );
      if (newProfile) {
        const dst = getProfilePath(presetName, targetVersion);
        fs.writeFile(dst, newProfile).then(() => {
          console.log(`Wrote to '${dst}'`);
        });
      }
    } catch (e) {
      if (e.distTags) {
        console.error(
          [
            e.message,
            "Available tags:",
            ...Object.entries(e.distTags).map(
              ([tag, version]) => `  - ${tag}: ${version}`
            ),
          ].join("\n")
        );
      } else {
        console.error(e);
      }
      process.exit(1);
    }
  }

  const ignoredCapabilities = [
    "babel-preset-react-native",
    "core",
    "core-android",
    "core-ios",
    "core-macos",
    "core-windows",
    "hermes",
    "metro",
    "metro-config",
    "metro-core",
    "metro-react-native-babel-transformer",
    "metro-resolver",
    "metro-runtime",
    "react",
    "react-dom",
    "react-test-renderer",
  ];

  /** @type {Record<string, PackageInfo>} */
  const delta = {};
  await Promise.all(
    Object.entries(latestProfile)
      .filter(([capability]) => {
        return !ignoredCapabilities.includes(capability);
      })
      .map(async ([capability, pkg]) => {
        await fetchPackageInfo(pkg).then((info) => {
          if (info) {
            delta[capability] = info;
          }
        });
      })
  );

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
}

const options = (() => {
  const options = {};
  process.argv.slice(2).forEach((arg) => {
    switch (arg) {
      case "--force":
        options.force = true;
        break;
      default:
        if (!/^\d+\.\d+$/.test(arg)) {
          console.error(
            `Expected version in the format '<major>.<minor>', got: ${arg}`
          );
          process.exit(1);
        }
        options.targetVersion = arg;
        break;
    }
  });
  return options;
})();

main(options);
