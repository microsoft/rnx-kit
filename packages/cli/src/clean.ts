import type { Config as CLIConfig } from "@react-native-community/cli-types";
import path from "path";

type Args = {
  platform: "android" | "ios";
  projectRoot: string;
};

const COMMAND_NAME = "rnx-clean";

export function rnxClean(
  _argv: string[],
  _config: CLIConfig,
  { platform, projectRoot }: Args
): void {
  const commandIndex = process.argv.indexOf(COMMAND_NAME);
  if (commandIndex < 0) {
    throw new Error("Failed to parse command arguments");
  }

  // Copy and remove the first arguments from `node react-native rnx-clean ...`
  const argv = process.argv.slice(commandIndex + 1);

  const platformIndex = argv.indexOf("--platform");
  if (platformIndex < 0) {
    throw new Error("A target platform must be specified");
  }

  const projectRootIndex = argv.indexOf("--project-root");
  if (projectRootIndex < 0) {
    throw new Error("A project root must be specified");
  }

  //nuke metro && install dependecies
  execute(
    "killall watchman && watchman watch-del-all && rm -rf $TMPDIR/react-* && rm -rf $TMPDIR/metro-* && rm -rf node_modules && yarn cache clean && yarn install",
    projectRoot
  );

  switch (platform) {
    case "ios":
      execute(
        'cd ios; killall Xcode ; xcrun -k && xcodebuild -alltargets clean && rm -rf "$(getconf DARWIN_USER_CACHE_DIR)/org.llvm.clang/ModuleCache" && rm -rf "$(getconf DARWIN_USER_CACHE_DIR)/org.llvm.clang.$(whoami)/ModuleCache" && rm -rf ~/Library/Developer/Xcode/DerivedData/* && rm -rf ~/Library/Caches/com.apple.dt.Xcode/* && rm -rf Pods && pod cache clean --all && rm -rf ~/.cocoapods && pod install && yarn start --reset-cache',
        projectRoot
      );
      break;
    case "android":
      execute(
        "cd android; ./gradlew clean && yarn watch --reset-cache ",
        projectRoot
      );
      break;
  }
}

function execute(command: string, rootPath: string) {
  const { spawnSync } = require("child_process");

  spawnSync(command, {
    cwd: path.resolve(rootPath),
    stdio: "inherit",
    shell: true,
  });
}
