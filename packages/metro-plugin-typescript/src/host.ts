import { getAvailablePlatforms } from "@rnx-kit/tools-react-native";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { platformExtensions } from "@rnx-kit/tools-react-native/platform";
import semverSatisfies from "semver/functions/satisfies";
import ts from "typescript";
import {
  resolveModuleNameLiterals,
  resolveModuleNames,
  resolveTypeReferenceDirectiveReferences,
  resolveTypeReferenceDirectives,
} from "./resolver";
import type { ResolverContext } from "./types";

const DEFAULT_PACKAGE_NAME = "react-native";

function identity<T>(v: T): T {
  return v;
}

/**
 * Create a function that replaces a 'react-native' module reference with a
 * reference to the target platform's react-native package. This only happens
 * when targeting an out-of-tree platform like Windows or macOS.
 *
 * @param currentDirectory Current directory – used to find available React Native platforms
 * @param platform Target platform
 * @param disableReactNativePackageSubstitution Flag controlling whether or not the returned function has an effect
 * @returns Function which replaces a 'react-native' module reference, or a function which has no effect if module replacement is not needed or disabled
 */
export function createReactNativePackageNameReplacer(
  currentDirectory: string,
  platform: string,
  disableReactNativePackageSubstitution: boolean
): (m: string) => string {
  if (disableReactNativePackageSubstitution) {
    return identity;
  }

  const platformPackageName = getAvailablePlatforms(currentDirectory)[platform];
  if (!platformPackageName) {
    return identity;
  }

  return (m) => {
    if (!m.startsWith(DEFAULT_PACKAGE_NAME)) {
      return m;
    }

    return platformPackageName + m.substring(DEFAULT_PACKAGE_NAME.length);
  };
}

/**
 * Factory which produces a function to enhance a TypeScript language service host.
 * The enhanced host uses a custom TypeScript module resolver capable of handling
 * React Native platform extensions (e.g. files like "app.ios.ts" and "app.native.ts").
 *
 * @param platform Target platform for the React Native project
 * @param ts Used for _mocking_ only. This parameter must _always_ be last.
 * @returns A function which enhances a TypeScript language service host
 */
export function createEnhanceLanguageServiceHost(
  platform: AllPlatforms,
  { version: tsVersion } = ts
): (host: ts.LanguageServiceHost) => void {
  /**
   * Starting with TypeScript 4.7, a new compiler option named `moduleSuffixes`
   * is available. We use this to configure the built-in module resolver for
   * React Native projects.
   */
  if (!semverSatisfies(tsVersion, ">=4.7.0")) {
    throw new Error("TypeScript >=4.7 is required");
  }

  const disableReactNativePackageSubstitution = true;
  const platformExtensionNames = platformExtensions(platform);
  const platformFileExtensions = platformExtensionNames.map((e) => `.${e}`);

  // Make the last platform file extension blank so that resolution falls back
  // to files which have no extension.
  platformFileExtensions.push("");

  return (host) => {
    const context: ResolverContext = {
      host,
      disableReactNativePackageSubstitution,
      platform,
      platformFileExtensions,
      replaceReactNativePackageName: createReactNativePackageNameReplacer(
        host.getCurrentDirectory(),
        platform,
        disableReactNativePackageSubstitution
      ),
    };

    if (semverSatisfies(tsVersion, ">=5.0")) {
      host.resolveModuleNameLiterals = (...args) =>
        resolveModuleNameLiterals(context, ...args);
      host.resolveTypeReferenceDirectiveReferences = (...args) =>
        resolveTypeReferenceDirectiveReferences(context, ...args);
    } else {
      host.resolveModuleNames = resolveModuleNames.bind(undefined, context);
      host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives.bind(
        undefined,
        context
      );
    }
  };
}
