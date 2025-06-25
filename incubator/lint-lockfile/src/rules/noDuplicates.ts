import type { NoDuplicatesRuleOptions as Options } from "@rnx-kit/config/lint.types";
import type { Rule } from "../types.ts";

type PackageCount = Record<string, number | undefined>;

export const PRESETS: Record<string, PackageCount> = {
  "#react-native": {
    "@callstack/react-native-visionos": 1,
    "@react-native-community/cli": 1,
    "@react-native-community/cli-platform-android": 1,
    "@react-native-community/cli-platform-apple": 1,
    "@react-native-community/cli-platform-ios": 1,
    "@react-native-community/cli-server-api": 1,
    "@react-native-community/cli-tools": 1,
    "@react-native-community/cli-types": 1,
    "@react-native-community/template": 1,
    "@react-native-mac/virtualized-lists": 1,
    "@react-native/assets-registry": 1,
    "@react-native/babel-plugin-codegen": 1,
    "@react-native/babel-preset": 1,
    "@react-native/codegen": 1,
    "@react-native/community-cli-plugin": 1,
    "@react-native/debugger-frontend": 1,
    "@react-native/dev-middleware": 1,
    "@react-native/gradle-plugin": 1,
    "@react-native/js-polyfills": 1,
    "@react-native/metro-babel-transformer": 1,
    "@react-native/metro-config": 1,
    "@react-native/normalize-colors": 1,
    "@react-native/virtualized-lists": 1,
    "metro-babel-transformer": 1,
    "metro-config": 1,
    "metro-core": 1,
    "metro-resolver": 1,
    "metro-runtime": 1,
    "metro-source-map": 1,
    "metro-transform-worker": 1,
    "react-native": 1,
    "react-native-macos": 1,
    "react-native-windows": 1,
    metro: 1,
    react: 1,
  },
};

export function createPackageMap(
  packages: Required<Options>["packages"]
): PackageCount {
  const count: PackageCount = {};
  for (const pkg of packages) {
    if (typeof pkg === "string") {
      if (pkg in PRESETS) {
        Object.assign(count, PRESETS[pkg]);
      } else {
        count[pkg] = 1;
      }
    } else if (Array.isArray(pkg)) {
      count[pkg[0]] = pkg[1];
    }
  }
  return count;
}

export function noDuplicatesRule(options: Options = {}): void | Rule {
  if (
    options.enabled === false ||
    !Array.isArray(options.packages) ||
    options.packages.length === 0
  ) {
    return;
  }

  const packagesCount = createPackageMap(options.packages);

  return (context, _key, { package: name }) => {
    let count = packagesCount[name];
    if (count != null) {
      if (--count < 0) {
        context.report(`Multiple copies of '${name}' found in the lockfile`);
        packagesCount[name] = undefined;
      } else {
        packagesCount[name] = count;
      }
    }
  };
}
