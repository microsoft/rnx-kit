/**
 * Copy of types from `@rnx-kit/tools-apple`. If Jest wasn't such a pain to
 * configure, we would have added an `import type` at the top instead:
 *
 *     import type { BuildParams as AndroidBuildParams } from "@rnx-kit/tools-android" with { "resolution-mode": "import" };
 *     import type { BuildParams as AppleBuildParams } from "@rnx-kit/tools-apple" with { "resolution-mode": "import" };
 *
 * But Jest doesn't like import attributes and it doesn't matter if we add
 * `@babel/plugin-syntax-import-attributes` in the config.
 *
 * TOOD: Remove this file when we can migrate away from Jest in this package.
 */

export type DeviceType = "device" | "emulator" | "simulator";

export type BuildConfiguration = "Debug" | "Release";

export type AndroidBuildParams = {
  platform: "android";
  destination?: DeviceType;
  configuration?: BuildConfiguration;
  archs?: string;
};

export type AppleBuildParams =
  | {
      platform: "ios" | "visionos";
      scheme?: string;
      destination?: DeviceType;
      configuration?: BuildConfiguration;
      archs?: string;
      isBuiltRemotely?: boolean;
    }
  | {
      platform: "macos";
      scheme?: string;
      configuration?: BuildConfiguration;
      isBuiltRemotely?: boolean;
    };

export type AndroidInputParams = AndroidBuildParams & {
  device?: string;
};

export type AppleInputParams = AppleBuildParams & {
  device?: string;
  workspace?: string;
};

export type InputParams = AndroidInputParams | AppleInputParams;
