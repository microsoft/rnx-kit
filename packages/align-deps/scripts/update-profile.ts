#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { untar } from "@rnx-kit/tools-shell";
import { markdownTable } from "markdown-table";
import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import * as util from "node:util";
import packageJson from "package-json";
import semverCoerce from "semver/functions/coerce.js";
import semverCompare from "semver/functions/compare.js";
import type { MetaPackage, Package, Preset } from "../src/types.js";

type Options = {
  targetVersion?: string;
  preset: string;
  force: boolean;
  releaseCandidate: boolean;
};

type PackageInfo = {
  name: string;
  version: string;
  latest: string;
  modified: string;
  homepage?: string;
  tarball: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type TemplateParams = {
  preset: string;
  targetVersion: string;
  reactVersion: string;
  cliVersion: string;
  cliAndroidVersion: string;
  cliIOSVersion: string;
  metroVersion: string;
};

function assertFulfilled<T>(
  result: PromiseSettledResult<T>,
  tag: string
): asserts result is PromiseFulfilledResult<T> {
  if (result.status !== "fulfilled") {
    throw new Error(
      `Failed to get ${tag} version of 'react-native': ${result.reason}`
    );
  }
}

function coerceVersion(
  version: string
): NonNullable<ReturnType<typeof semverCoerce>> {
  const coerced = semverCoerce(version);
  if (!coerced) {
    throw new Error(`Failed to coerce version: ${version}`);
  }
  return coerced;
}

/**
 * Fetches package manifest from npm.
 */
async function fetchPackageInfo(
  pkg: MetaPackage | Package,
  targetVersion = "latest"
): Promise<PackageInfo | void> {
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
    repository,
    dist: { tarball },
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
    homepage: homepage ?? repository?.url ?? repository,
    dependencies,
    peerDependencies,
    tarball,
  };
}

function getPackageVersion(
  packageName: string,
  dependencies?: Record<string, string>
): string {
  const packageVersion = dependencies?.[packageName];
  if (!packageVersion) {
    throw new Error(`Failed to get '${packageName}' version`);
  }

  return coerceVersion(packageVersion).version;
}

/**
 * Returns the path to a profile.
 */
function getProfilePath(
  preset: string,
  profileVersion: string
): [string, string] {
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
 */
function isMetaPackage(pkg: MetaPackage | Package): pkg is MetaPackage {
  return pkg.name === "#meta" && Array.isArray(pkg.capabilities);
}

/**
 * Generates a profile.
 */
function generateFromTemplate({
  preset,
  targetVersion,
  reactVersion,
  cliVersion,
  cliAndroidVersion,
  cliIOSVersion,
  metroVersion,
}: TemplateParams): string {
  const nextVersionCoerced = coerceVersion(targetVersion);
  const { major, minor } = nextVersionCoerced;
  const currentVersion = `${major}.${minor - 1}`;

  const [currentProfile] = getProfilePath(preset, currentVersion);
  if (!fs.existsSync(currentProfile)) {
    throw new Error(`Could not find '${currentProfile}'`);
  }

  const currentVersionVarName = `${major}_${minor - 1}`;

  const useOldBabelNames = semverCompare(nextVersionCoerced, "0.73.0") < 0;
  const babelPresetName = useOldBabelNames
    ? "metro-react-native-babel-preset"
    : "@react-native/babel-preset";
  const babelPresetVersion = useOldBabelNames
    ? metroVersion
    : targetVersion + ".0";
  const babelTransformerName = useOldBabelNames
    ? "metro-react-native-babel-transformer"
    : "@react-native/metro-babel-transformer";
  const babelTransformerVersion = useOldBabelNames
    ? metroVersion
    : targetVersion + ".0";

  return `import type { Package, Profile } from "../../../types";
import { profile as profile_${currentVersionVarName} } from "./profile-${currentVersion}";

const reactNative: Package = {
  name: "react-native",
  version: "^${targetVersion}.0",
  capabilities: ["react", "core/metro-config", "community/cli"],
};

export const profile: Profile = {
  ...profile_${currentVersionVarName},

  /*********
   * React *
   *********/

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

  /********
   * Core *
   ********/

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^${targetVersion}.0",
    capabilities: ["react"],
  },
  "core-visionos": {
    name: "@callstack/react-native-visionos",
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

  /*********
   * Tools *
   *********/

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
    name: "${babelTransformerName}",
    version: "^${babelTransformerVersion}",
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

  /*********************
   * Community Modules *
   *********************/
};
`;
}

/**
 * Returns the current Metro version by resolving react-native's dependencies.
 */
async function getCurrentMetroVersion(
  dependencies: Required<PackageInfo>["dependencies"]
): Promise<string> {
  const chain = ["react-native", "@react-native/community-cli-plugin"];
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
          return packageInfo.dependencies;
        } catch (e) {
          if (e.code === "ETARGET" || e.name === "VersionNotFoundError") {
            // Some packages, such as `@react-native-community/cli`, are still
            // in alpha or beta while react-native is in pre-release. Try
            // again with the `next` tag.
            const packageInfo = await packageJson(packageName, {
              version: "next",
              fullMetadata: true,
            });
            return packageInfo.dependencies;
          } else {
            return undefined;
          }
        }
      }),
    Promise.resolve(dependencies)
  );

  if (!deps) {
    throw new Error("Failed to get 'metro' version");
  }

  return getPackageVersion("metro", deps);
}

/**
 * Fetches package versions for specified react-native version.
 */
async function makeProfile(
  preset: string,
  targetVersion: string
): Promise<string | undefined> {
  const templatePkg = {
    name: "@react-native-community/template",
    version: "0.0.0",
  };
  const template = await fetchPackageInfo(templatePkg, `^${targetVersion}.0-0`);
  if (!template) {
    throw new Error(
      `Failed to fetch the manifest for '${templatePkg.name}@${targetVersion}`
    );
  }

  const { tarball } = template;
  const templateDir = await new Promise<string>((resolve, reject) => {
    https
      .get(tarball, (res) => {
        const tmpUrl = new URL("../node_modules/.tmp", import.meta.url);
        fs.mkdirSync(tmpUrl, { recursive: true });

        const tmpDir = fileURLToPath(tmpUrl);
        const dest = path.join(fileURLToPath(tmpUrl), path.basename(tarball));
        const fh = fs.createWriteStream(dest);
        res.pipe(fh);
        fh.on("finish", () => {
          fh.close();
          untar(dest);
          resolve(path.join(tmpDir, "package"));
        });
      })
      .on("error", (err) => reject(err));
  });

  const manifestPath = path.join(templateDir, "template", "package.json");
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, { encoding: "utf-8" })
  );

  const { dependencies, devDependencies } = manifest;
  if (!dependencies) {
    throw new Error(
      `Failed to get dependencies of '${templatePkg.name}@${targetVersion}`
    );
  }
  if (!devDependencies) {
    throw new Error(
      `Failed to get dev dependencies of '${templatePkg.name}@${targetVersion}`
    );
  }

  return generateFromTemplate({
    preset,
    targetVersion,
    reactVersion: getPackageVersion("react", dependencies),
    cliVersion: getPackageVersion(
      "@react-native-community/cli",
      devDependencies
    ),
    cliAndroidVersion: getPackageVersion(
      "@react-native-community/cli-platform-android",
      devDependencies
    ),
    cliIOSVersion: getPackageVersion(
      "@react-native-community/cli-platform-ios",
      devDependencies
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
 */
async function main({
  preset: presetName,
  targetVersion = "",
  force,
}: Options): Promise<void> {
  const { preset }: { preset: Readonly<Preset> } = await import(
    `../lib/presets/${presetName}.js`
  );
  const allVersions: string[] = Object.keys(preset)
    .sort((lhs, rhs) => semverCompare(coerceVersion(lhs), coerceVersion(rhs)))
    .reverse();

  if (targetVersion) {
    if (!force && preset[targetVersion]) {
      throw new Error(
        `A profile for '${targetVersion}' already exists. To overwrite it anyway, re-run with '--force'.`
      );
    }

    try {
      const newProfile = await makeProfile(presetName, targetVersion);
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
        throw new Error(
          [
            e.message,
            "Available tags:",
            ...Object.entries(e.distTags).map(
              ([tag, version]) => `  - ${tag}: ${version}`
            ),
          ].join("\n")
        );
      }

      throw e;
    }
  }

  const ignoredCapabilities = [
    "babel-preset-react-native",
    "community/cli",
    "community/cli-android",
    "community/cli-ios",
    "core",
    "core-android",
    "core-ios",
    "core-macos",
    "core-windows",
    "core/metro-config",
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

  const delta: [string, string, string, string, string | undefined][] = [];
  await Promise.all(
    Object.entries(preset[allVersions[0]])
      .filter(([capability]) => !ignoredCapabilities.includes(capability))
      .map(([capability, pkg]) =>
        fetchPackageInfo(pkg).then((info) => {
          if (info) {
            const { name, version, latest, modified, homepage } = info;
            delta.push([
              capability,
              name,
              version,
              version.endsWith(latest)
                ? "="
                : `${latest} (${modified.split("T")[0]})`,
              homepage,
            ]);
          }
        })
      )
  );

  const collator = new Intl.Collator();
  delta.sort((lhs, rhs) => collator.compare(lhs[0], rhs[0]));
  if (delta.length > 0) {
    console.log();
    console.log(
      markdownTable([
        ["Capability", "Name", "Version", "Latest", "Homepage"],
        ...delta,
      ])
    );
  }
}

async function parseArgs(): Promise<Options> {
  const { values, positionals } = util.parseArgs({
    args: process.argv.slice(2),
    options: {
      preset: {
        type: "string",
        short: "p",
        default: "microsoft/react-native",
      },
      force: {
        type: "boolean",
        short: "f",
        default: false,
      },
      "release-candidate": {
        type: "boolean",
        default: false,
      },
    },
    strict: true,
    allowPositionals: true,
    tokens: false,
  });

  const options: Options = {
    preset: values.preset,
    force: values.force,
    releaseCandidate: values["release-candidate"],
  };

  if (positionals.length > 0) {
    const arg = positionals[0];
    if (options.releaseCandidate) {
      throw new Error(
        `Unexpected argument '${arg}'; argument conflicts with '--release-candidate'`
      );
    }
    if (!/^\d+\.\d+$/.test(arg)) {
      throw new Error(
        `Expected version in the format '<major>.<minor>', got: ${arg}`
      );
    }

    options.targetVersion = arg;
  }

  if (options.releaseCandidate) {
    const [latest, next] = await Promise.allSettled([
      packageJson("react-native", { version: "latest" }),
      packageJson("react-native", { version: "next" }),
    ]);

    assertFulfilled(latest, "latest");
    assertFulfilled(next, "next");

    const latestVersion = latest.value.version;
    const nextVersion = next.value.version;
    if (semverCompare(latestVersion, nextVersion) >= 0) {
      throw new Error(
        `No new release candidate available since ${latestVersion}`
      );
    }

    console.log("Found release candidate:", nextVersion);

    const { major, minor } = coerceVersion(nextVersion);
    options.targetVersion = `${major}.${minor}`;
  }

  return options;
}

parseArgs()
  .then(main)
  .catch((e: Error) => {
    console.error(e.message);
    process.exitCode = 1;
  });
