import type { Command } from "@react-native-community/cli-types";
import { alignDepsCommand } from "@rnx-kit/align-deps";
import { writeThirdPartyNoticesCommand } from "@rnx-kit/third-party-notices";
import { rnxBuild, rnxBuildCommand } from "./build.ts";
import { rnxBundle, rnxBundleCommand } from "./bundle.ts";
import { rnxClean, rnxCleanCommand } from "./clean.ts";
import { copyProjectAssets, rnxCopyAssetsCommand } from "./copy-assets.ts";
import { rnxRamBundle, rnxRamBundleCommand } from "./ram-bundle.ts";
import { rnxRun, rnxRunCommand } from "./run.ts";
import { rnxStart, rnxStartCommand } from "./start.ts";
import { rnxTest, rnxTestCommand } from "./test.ts";

export {
  copyProjectAssets,
  rnxBuild,
  rnxBuildCommand,
  rnxBundle,
  rnxBundleCommand,
  rnxClean,
  rnxCleanCommand,
  rnxCopyAssetsCommand,
  rnxRamBundle,
  rnxRamBundleCommand,
  rnxRun,
  rnxRunCommand,
  rnxStart,
  rnxStartCommand,
  rnxTest,
  rnxTestCommand,
};

export const reactNativeConfig = {
  commands: [
    rnxBundleCommand,
    rnxRamBundleCommand,
    rnxStartCommand,
    rnxBuildCommand,
    rnxRunCommand,
    rnxCopyAssetsCommand,
    alignDepsCommand,
    rnxTestCommand,
    writeThirdPartyNoticesCommand,
    rnxCleanCommand,
  ] as Command<false>[],
};

// @rnx-kit/align-deps
export const rnxAlignDeps = alignDepsCommand.func;
export const rnxAlignDepsCommand = alignDepsCommand;

// @rnx-kit/third-party-notices
export const rnxWriteThirdPartyNotices: typeof writeThirdPartyNoticesCommand.func =
  writeThirdPartyNoticesCommand.func;
export const rnxWriteThirdPartyNoticesCommand: typeof writeThirdPartyNoticesCommand =
  writeThirdPartyNoticesCommand;
