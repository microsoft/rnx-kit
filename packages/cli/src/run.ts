import type { Config } from "@react-native-community/cli-types";
import { rnxBuildCommand } from "./build";
import type { InputParams } from "./build/apple";
import { runIOS } from "./run/ios";
import { runMacOS } from "./run/macos";

export function rnxRun(
  _argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "ios":
      return runIOS(config, buildParams);
    case "macos":
      return runMacOS(config, buildParams);
    default:
      // @ts-expect-error Safe guard against user input
      console.error(`Unsupported platform: ${buildParams.platform}`);
      process.exitCode = 1;
      return Promise.resolve();
  }
}

export const rnxRunCommand = {
  name: "rnx-run",
  description:
    "Build and run your native app for testing in emulator/simulator or on device",
  func: rnxRun,
  options: [
    ...rnxBuildCommand.options,
    {
      name: "--device <string>",
      description: "The name of the device to launch the app in",
    },
  ],
};
