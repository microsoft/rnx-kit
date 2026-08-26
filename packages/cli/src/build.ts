import type { Config } from "@react-native-community/cli-types";
import { InvalidArgumentError } from "commander";
import { RNX_FAST_PATH } from "./bin/constants.ts";
import { setCcacheDir, setCcacheHome } from "./build/ccache.ts";
import type {
  BuildConfiguration,
  DeviceType,
  InputParams,
} from "./build/types.ts";

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
    case "windows":
      return platform;
    default:
      throw new InvalidArgumentError(
        "Supported platforms: 'android', 'ios', 'macos', 'visionos', 'windows'."
      );
  }
}

export async function rnxBuild(
  argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "android": {
      const { buildAndroid } = await import("./build/android.ts");
      return buildAndroid(config, buildParams, argv);
    }

    case "ios":
    case "visionos": {
      const { buildIOS } = await import("./build/ios.ts");
      return buildIOS(config, buildParams);
    }

    case "macos": {
      const { buildMacOS } = await import("./build/macos.ts");
      return buildMacOS(config, buildParams);
    }

    case "windows": {
      const { buildWindows } = await import("./build/windows.ts");
      return buildWindows(config, buildParams, argv);
    }
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
      name: "--verbose",
      description: "Stream the underlying build tool's output as-is",
    },
    {
      name: "--solution <string>",
      description:
        "Path, relative to project root, of the Visual Studio solution to build (Windows only)",
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
