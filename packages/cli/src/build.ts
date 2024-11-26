import type { Config } from "@react-native-community/cli-types";
import { InvalidArgumentError } from "commander";
import { RNX_FAST_PATH } from "./bin/constants";
import { buildAndroid } from "./build/android";
import { setCcacheDir, setCcacheHome } from "./build/ccache";
import { buildIOS } from "./build/ios";
import { buildMacOS } from "./build/macos";
import type {
  BuildConfiguration,
  DeviceType,
  InputParams,
} from "./build/types";

function asConfiguration(configuration: string): BuildConfiguration {
  switch (configuration) {
    case "Debug":
    case "Release":
      return configuration;

    default:
      throw new InvalidArgumentError("Expected 'Debug' or 'Release'.");
  }
}

function asDestination(destination: string): DeviceType {
  switch (destination) {
    case "device":
    case "emulator":
    case "simulator":
      return destination;

    default:
      throw new InvalidArgumentError(
        "Expected 'device', 'emulator', or 'simulator'."
      );
  }
}

function asSupportedPlatform(platform: string): InputParams["platform"] {
  switch (platform) {
    case "android":
    case "ios":
    case "macos":
    case "visionos":
      return platform;
    default:
      throw new InvalidArgumentError(
        "Supported platforms: 'android', 'ios', 'macos', 'visionos'."
      );
  }
}

export function rnxBuild(
  _argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "android":
      return buildAndroid(config, buildParams);

    case "ios":
    case "visionos":
      return buildIOS(config, buildParams);

    case "macos":
      return buildMacOS(config, buildParams);
  }
}

export const rnxBuildCommand = {
  // The build command requires the `project` field, which currently requires
  // loading the full config.
  [RNX_FAST_PATH]: false,
  name: "rnx-build",
  description:
    "Build your native app for testing in emulator/simulator or on device",
  func: rnxBuild,
  options: [
    {
      name: "-p, --platform <string>",
      description: "Target platform",
      parse: asSupportedPlatform,
    },
    {
      name: "--workspace <string>",
      description:
        "Path, relative to project root, of the Xcode workspace to build (macOS only)",
    },
    {
      name: "--scheme <string>",
      description: "Name of scheme to build (Apple platforms only)",
    },
    {
      name: "--configuration <string>",
      description:
        "Build configuration for building the app; 'Debug' or 'Release'",
      default: "Debug",
      parse: asConfiguration,
    },
    {
      name: "--destination <string>",
      description:
        "Destination of the built app; 'device', 'emulator', or 'simulator'",
      default: "simulator",
      parse: asDestination,
    },
    {
      name: "--ccache-dir <string>",
      description: "Path to Ccache config",
      parse: setCcacheDir,
    },
    {
      name: "--ccache-home <string>",
      description: "Path to Ccache installation",
      parse: setCcacheHome,
    },
  ],
};
