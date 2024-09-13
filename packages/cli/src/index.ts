import type { Command } from "@react-native-community/cli-types";
import { alignDepsCommand } from "@rnx-kit/align-deps";
import { writeThirdPartyNoticesCommand } from "@rnx-kit/third-party-notices";
import { rnxBuild, rnxBuildCommand } from "./build";
import { rnxBundle, rnxBundleCommand } from "./bundle";
import { rnxClean, rnxCleanCommand } from "./clean";
import { copyProjectAssets, rnxCopyAssetsCommand } from "./copy-assets";
import { rnxRamBundle, rnxRamBundleCommand } from "./ram-bundle";
import { rnxRun, rnxRunCommand } from "./run";
import { rnxStart, rnxStartCommand } from "./start";
import { rnxTest, rnxTestCommand } from "./test";

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
export const rnxWriteThirdPartyNotices = writeThirdPartyNoticesCommand.func;
export const rnxWriteThirdPartyNoticesCommand = writeThirdPartyNoticesCommand;
