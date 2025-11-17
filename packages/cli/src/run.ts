import type { Config } from "@react-native-community/cli-types";
import { RNX_FAST_PATH } from "./bin/constants.ts";
import { rnxBuildCommand } from "./build.ts";
import type { InputParams } from "./build/types.ts";
import { runAndroid } from "./run/android.ts";
import { runIOS } from "./run/ios.ts";
import { runMacOS } from "./run/macos.ts";
import { runWindows } from "./run/windows.ts";

export function rnxRun(
  argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "android":
      return runAndroid(config, buildParams, argv);

    case "ios":
    case "visionos":
      return runIOS(config, buildParams);

    case "macos":
      return runMacOS(config, buildParams);

    case "windows":
      return runWindows(config, buildParams, argv);
  }
}

export const rnxRunCommand = {
  // The run command may invoke the build command which currently requires
  // loading the full config.
  [RNX_FAST_PATH]: false,
  name: "rnx-run",
  description:
    "Build and run your native app for testing in emulator/simulator or on device",
  func: rnxRun,
  options: [
    ...rnxBuildCommand.options,
    {
      name: "-d, --device <string>",
      description: "The name of the device to launch the app in",
    },
  ],
};
