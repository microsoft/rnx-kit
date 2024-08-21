import type { Config } from "@react-native-community/cli-types";
import type { InputParams } from "./build/apple";
import { buildIOS } from "./build/ios";
import { buildMacOS } from "./build/macos";

export function rnxBuild(
  _argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "ios":
      return buildIOS(config, buildParams);
    case "macos":
      return buildMacOS(config, buildParams);
    default:
      // @ts-expect-error Safe guard against user input
      console.error(`Unsupported platform: ${buildParams.platform}`);
      process.exitCode = 1;
      return Promise.resolve();
  }
}

export const rnxBuildCommand = {
  name: "rnx-build",
  description:
    "Build your native app for testing in emulator/simulator or on device",
  func: rnxBuild,
  options: [
    {
      name: "--platform <string>",
      description: "Target platform",
    },
    {
      name: "--scheme <string>",
      description: "Name of scheme to build",
    },
    {
      name: "--destination <string>",
      description: "'device' or 'simulator'",
      default: "simulator",
    },
    {
      name: "--configuration <string>",
      description: "'Debug' or 'Release'",
      default: "Debug",
    },
    {
      name: "--workspace <string>",
      description:
        "Path, relative to project root, of the Xcode workspace to build (macOS only)",
    },
  ],
};
