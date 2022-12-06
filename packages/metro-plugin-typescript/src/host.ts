import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { platformExtensions } from "@rnx-kit/tools-react-native/platform";
import {
  changeHostToUseReactNativeResolver,
  createReactNativePackageNameReplacer,
} from "@rnx-kit/typescript-react-native-resolver";
import semverSatisfies from "semver/functions/satisfies";
import ts from "typescript";
import { resolveModuleNames, resolveTypeReferenceDirectives } from "./resolver";
import type { ResolverContext } from "./types";

/**
 * Factory which produces a function to enhance a TypeScript language service host.
 * The enhanced host uses a custom TypeScript module resolver capable of handling
 * React Native platform extensions (e.g. files like "app.ios.ts" and "app.native.ts").
 *
 * @param platform Target platform for the React Native project
 * @param options TypeScript compiler options for the project (only used for TS < 4.7)
 * @returns A function which enhances a TypeScript language service host
 */
export function createEnhanceLanguageServiceHost(
  platform: AllPlatforms,
  options: ts.CompilerOptions
): (host: ts.LanguageServiceHost) => void {
  const platformExtensionNames = platformExtensions(platform);
  const platformFileExtensions = platformExtensionNames.map(
    (e) => `.${e}` // prepend a '.' to each name to make it a file extension
  );
  const disableReactNativePackageSubstitution = true;

  /**
   * Starting with TypeScript 4.7, a new compiler option named `moduleSuffixes` is
   * available. We use this to configure the built-in TypeScript module resolver for
   * React Native projects, rather than @rnx-kit/typescript-react-native-resolver.
   *
   * Using the built-in TS resolver is best because it is actively maintained,
   * up-to-date with changes in the Node ecosystem, and supports more scenarios
   * such as path remapping (baseUrl, paths, rootDir).
   */
  if (semverSatisfies(ts.version, ">=4.7.0")) {
    //  Use simple resolvers that delegate to the built-in TS resolvers

    return (host: ts.LanguageServiceHost) => {
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

      host.resolveModuleNames = resolveModuleNames.bind(undefined, context);
      host.resolveTypeReferenceDirectives = resolveTypeReferenceDirectives.bind(
        undefined,
        context
      );
    };
  }

  //  Use our custom resolvers from @rnx-kit/typescript-react-native-resolver

  return (host: ts.LanguageServiceHost) => {
    changeHostToUseReactNativeResolver({
      host,
      options,
      platform,
      platformExtensionNames,
      disableReactNativePackageSubstitution,
    });
  };
}
