import type { Config } from "@react-native-community/cli-types";
import { RNX_FAST_PATH } from "./bin/constants.ts";
import { rnxBuildCommand } from "./build.ts";
import type { InputParams } from "./build/types.ts";

export async function rnxRun(
  argv: string[],
  config: Config,
  buildParams: InputParams
) {
  switch (buildParams.platform) {
    case "android": {
      const { runAndroid } = await import("./run/android.ts");
      return runAndroid(config, buildParams, argv);
    }

    case "ios":
    case "visionos": {
      const { runIOS } = await import("./run/ios.ts");
      return runIOS(config, buildParams);
    }

    case "macos": {
      const { runMacOS } = await import("./run/macos.ts");
      return runMacOS(config, buildParams);
    }

    case "windows": {
      const { runWindows } = await import("./run/windows.ts");
      return runWindows(config, buildParams, argv);
    }
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
