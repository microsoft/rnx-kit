#!/usr/bin/env node
// @ts-check

import { markdownTable } from "markdown-table";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";
import packageJson from "package-json";
import semverCoerce from "semver/functions/coerce.js";
import semverCompare from "semver/functions/compare.js";

/**
 * @typedef {import("../src/types").MetaPackage} MetaPackage
 * @typedef {import("../src/types").Package} Package
 * @typedef {import("../src/types").Profile} Profile
 *
 * @typedef {{
 *   name: string;
 *   version: string;
 *   latest: string;
 *   modified: string;
 *   homepage?: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 * }} PackageInfo
 */

/**
 * This wrapper is mostly for coercing TypeScript into inferring the correct
 * type.
 * @param {any} v
 * @returns {Record<string, string> | undefined}
 */
const Optional = (v) => v;

/**
 * Fetches package manifest from npm.
 * @param {MetaPackage | Package} pkg
 * @param {string=} targetVersion
 * @returns {Promise<PackageInfo | void>}
 */
async function fetchPackageInfo(pkg, targetVersion = "latest") {
  if (isMetaPackage(pkg)) {
    return Promise.resolve();
  }

  const { name, version } = pkg;
  const manifest = await packageJson(name, {
    version: targetVersion,
    fullMetadata: true,
  });

  const {
    version: latest,
    homepage,
    dependencies,
    peerDependencies,
    time,
  } = manifest;

  if (typeof latest !== "string") {
    throw new Error(`Failed to fetch manifest for '${name}'`);
  }

  return {
    name,
    version,
    latest,
    modified: time?.[latest] ?? "?",
    homepage,
    dependencies: Optional(dependencies),
    peerDependencies: Optional(peerDependencies),
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
 * @returns {[string, string]}
 */
function getProfilePath(preset, profileVersion) {
  const presetDir = path.relative(
    process.cwd(),
    new URL(`../src/presets/${preset}`, import.meta.url).pathname
  );
  return [
    path.join(presetDir, `profile-${profileVersion}.ts`),
    presetDir + ".ts",
  ];
}

/**
 * Returns whether the package is a meta package.
 *
 * Note: This is a copy of the function in 'src/capabilities.ts' to avoid having
 * to compile the whole package before we can run this script.
 *
 * @param {MetaPackage | Package} pkg
 * @returns {pkg is MetaPackage}
 */
function isMetaPackage(pkg) {
  return pkg.name === "#meta" && Array.isArray(pkg.capabilities);
}

/**
 * Generates a profile.
 * @param {{
 *   preset: string;
 *   targetVersion: string;
 *   reactVersion: string;
 *   cliVersion: string;
 *   cliAndroidVersion: string;
 *   cliIOSVersion: string;
 *   metroVersion: string;
 * }} versions
 * @returns {string}
 */
function generateFromTemplate({
  preset,
  targetVersion,
  reactVersion,
  cliVersion,
  cliAndroidVersion,
  cliIOSVersion,
  metroVersion,
}) {
  const nextVersionCoerced = semverCoerce(targetVersion);
  if (!nextVersionCoerced) {
    throw new Error(`Failed to coerce version: ${targetVersion}`);
  }

  const currentVersion = `${nextVersionCoerced.major}.${
    nextVersionCoerced.minor - 1
  }`;

  const [currentProfile] = getProfilePath(preset, currentVersion);
  if (!fs.existsSync(currentProfile)) {
    throw new Error(`Could not find '${currentProfile}'`);
  }

  const currentVersionVarName = `${nextVersionCoerced.major}_${
    nextVersionCoerced.minor - 1
  }`;

  const useOldBabelPresetName = semverCompare(nextVersionCoerced, "0.73.0") < 0;
  const babelPresetName = useOldBabelPresetName
    ? "metro-react-native-babel-preset"
    : "@react-native/babel-preset";
  const babelPresetVersion = useOldBabelPresetName
    ? metroVersion
    : targetVersion + ".0";

  return `import type { Package, Profile } from "../../../types";
import { profile as profile_${currentVersionVarName} } from "./profile-${currentVersion}";

const reactNative: Package = {
  name: "react-native",
  version: "^${targetVersion}.0",
  capabilities: ["react", "core/metro-config"],
};

export const profile: Profile = {
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
  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^${targetVersion}.0",
    devOnly: true,
  },

  "babel-preset-react-native": {
    name: "${babelPresetName}",
    version: "^${babelPresetVersion}",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^${cliVersion}",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^${cliAndroidVersion}",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^${cliIOSVersion}",
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
`;
}

/**
 * Returns the current Metro version by resolving react-native's dependencies.
 * @param {Required<PackageInfo>["dependencies"]} dependencies
 * @returns {Promise<string>}
 */
async function getCurrentMetroVersion(dependencies) {
  const metroVersionDependencyChains = [
    // 0.73+
    ["@react-native/community-cli-plugin"],
    // 0.65 - 0.72
    ["@react-native-community/cli", "@react-native-community/cli-plugin-metro"],
  ];

  for (const chain of metroVersionDependencyChains) {
    const deps = await chain.reduce(
      (p, packageName) =>
        p.then(async (dependencies) => {
          if (!dependencies) {
            return undefined;
          }

          try {
            const packageInfo = await packageJson(packageName, {
              version: getPackageVersion(packageName, dependencies),
              fullMetadata: true,
            });
            return Optional(packageInfo.dependencies);
          } catch (e) {
            if (e.code === "ETARGET" || e.name === "VersionNotFoundError") {
              // Some packages, such as `@react-native-community/cli`, are still
              // in alpha or beta while react-native is in pre-release. Try
              // again with the `next` tag.
              const packageInfo = await packageJson(packageName, {
                version: "next",
                fullMetadata: true,
              });
              return Optional(packageInfo.dependencies);
            } else {
              return undefined;
            }
          }
        }),
      Promise.resolve(Optional(dependencies))
    );

    if (deps) {
      return getPackageVersion("metro", deps);
    }
  }

  throw new Error("Failed to get 'metro' version");
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

  return generateFromTemplate({
    preset,
    targetVersion,
    reactVersion: getPackageVersion("react", peerDependencies),
    cliVersion: getPackageVersion("@react-native-community/cli", dependencies),
    cliAndroidVersion: getPackageVersion(
      "@react-native-community/cli-platform-android",
      dependencies
    ),
    cliIOSVersion: getPackageVersion(
      "@react-native-community/cli-platform-ios",
      dependencies
    ),
    metroVersion: await getCurrentMetroVersion(dependencies),
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
        const [dst, presetFile] = getProfilePath(presetName, targetVersion);
        fs.writeFile(dst, newProfile, () => {
          console.log(`Wrote to '${dst}'`);

          const profiles = fs
            .readdirSync(path.dirname(dst))
            .filter((file) => file.startsWith("profile-"))
            .map((file) => {
              const filename = path.basename(file, ".ts");
              const version = filename.substring("profile-".length);
              const varName = filename.replace(/[^\w]/g, "_");
              return [version, varName];
            });

          const preset = [
            `import type { Preset } from "../../types";`,
            ...profiles.map(
              ([version, varName]) =>
                `import { profile as ${varName} } from "./react-native/profile-${version}";`
            ),
            "",
            "// Also export this by name for scripts to work around a bug where this module",
            "// is wrapped twice, i.e. `{ default: { default: preset } }`, when imported as",
            "// ESM.",
            "export const preset: Readonly<Preset> = {",
            ...profiles.map(
              ([version, varName]) => `  "${version}": ${varName},`
            ),
            "};",
            "",
          ].join("\n");
          fs.writeFileSync(presetFile, preset);
          console.log(`Updated '${presetFile}'`);
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
        const { name, version, latest, modified, homepage } = delta[capability];
        return [
          capability,
          name,
          version,
          version.endsWith(latest)
            ? "="
            : `${latest} (${modified.split("T")[0]})`,
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
